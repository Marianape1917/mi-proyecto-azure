const http = require('http');
const mongoose = require('mongoose');
const redis = require('redis');

// Configuración de Redis
const redisClient = redis.createClient({
    url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`
});

redisClient.on('error', (err) => {
    console.error('Error en Redis:', err);
});

(async () => {    
    try {
        await redisClient.connect();
        console.log('Conectado a Redis');
    } catch (err) {
        console.error('Error al conectar a Redis:', err);
    }
})();// invocacion inmediata de una funcion asincrona autoinvocada // se declara y  ejeucta en el mismo lugar.. anonima aincrona


const getWeatherFromMongoDB = async (municipio, date, hour) => {
    try {
        // Verificamos que mongoose esté conectado y que esté usando la base `miapp`
        const db = mongoose.connection.useDb('miapp');
        const collection = db.collection(municipio);

        // Verificar el nombre de la colección y listar los documentos para inspección
        //console.log(`Colección seleccionada: ${municipio}`);
        const allDocuments = await collection.find().toArray();
        //console.log("Documentos en la colección:", allDocuments);

        // Realizar la consulta con date como string
        const weatherData = await collection.findOne({ date: date });
        // console.log("Datos encontrados:", weatherData);

        if (weatherData) {
            // Si se solicita una hora específica, devolver solo ese dato
            if (hour !== undefined) {
                return weatherData.hourlyData.find (data => data.hour === parseInt(hour)) || null;
            }
            return weatherData;
        }
        return null;
    } catch (error) {
        console.error("Error consultando MongoDB:", error);
        return null;
    }
};

// Conexión a MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Conectado a MongoDB'))
    .catch(err => console.error('Error conectando a MongoDB', err));

    const server = http.createServer(async (req, res) => {
        const { method, url } = req;
    
        if (method === 'GET' && url.startsWith('/weather/')) {
            const parts = url.split('/');
            const municipio = parts[2].split('?')[0].trim();
            const query = new URLSearchParams(url.split('?')[1]);
            const date = query.get('date');
            const hour = query.get('hour');
    
            console.log(`Municipio recibido: '${municipio}'`);
    
            if (!date) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Faltan parámetros en la consulta' }));
                return;
            }
    
            const redisKey = hour ? `${municipio}:${date}:${hour}` : `${municipio}:${date}`;
    
            try {
                if (!redisClient.isOpen) await redisClient.connect();
    
                const redisData = await redisClient.get(redisKey);//squema
                if (redisData) {
                    console.log(`Datos obtenidos desde Redis para la clave ${redisKey}`);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(redisData);
                    return;
                }
            } catch (error) {
                console.error('Error consultando Redis:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Error en la consulta de Redis' }));
                return;
            }
    
            const weatherData = await getWeatherFromMongoDB(municipio, date, hour);
    
            if (weatherData) {
                console.log(`Datos obtenidos desde MongoDB para ${municipio} en ${date}:`, weatherData);
            } else {
                console.log(`Datos no encontrados en MongoDB para ${municipio} en ${date}`);
            }
    
            if (!weatherData) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Datos no encontrados' }));
                return;
            }
    
            try {
                await redisClient.set(redisKey, JSON.stringify(weatherData), { EX: 3600 });
                console.log(`Datos almacenados en Redis para la clave ${redisKey}:`, weatherData);
            } catch (error) {
                console.error('Error guardando en Redis:', error);
            }
    
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(weatherData));
        } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Ruta no encontrada' }));
        }
    });
    
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
        console.log(`Servidor corriendo en el puerto ${PORT}`);
    });
    

process.on('SIGINT', () => {
    redisClient.quit(() => {
        console.log('Conexión de Redis cerrada');
        process.exit(0);
    });
});
