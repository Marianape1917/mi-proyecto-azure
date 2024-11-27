const mongoose = require('mongoose');
const axios = require('axios');
const http = require('http');

// Conectar a MongoDB
mongoose.connect('mongodb://mongodb:27017/miapp', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// Define un esquema y modelo para almacenar datos meteorológicos por hora y día
const hourlySchema = new mongoose.Schema({
    hour: Number, // La hora del día (0-23)
    temperature: Number, // Temperatura por hora
    humidity: Number, // Humedad por hora
    surfacePressure: Number, // Presión superficial por hora
    rain: Number, // Lluvia por hora
});

const dailyWeatherSchema = new mongoose.Schema({
    date: { type: Date, index: true }, // Fecha del día
    temperatureMax: Number, // Temperatura máxima del día
    temperatureMin: Number, // Temperatura mínima del día
    hourlyData: [hourlySchema], // Array de 24 subdocumentos (datos por hora)
    municipio: String, // Nombre del municipio
    lat: Number, // Latitud del municipio
    lon: Number, // Longitud del municipio
});

// Función para crear un modelo dinámico por municipio
const crearModeloMunicipio = (nombreMunicipio) => {
    return mongoose.model(nombreMunicipio, dailyWeatherSchema, nombreMunicipio);
};

const municipios = [
    
    { nombre: 'Abasolo', lat: 20.4554, lon: -101.5324 },
    { nombre: 'Acámbaro', lat: 20.0300, lon: -100.7226 },
    { nombre: 'Apaseo el Alto', lat: 20.4589, lon: -100.6051 },
    { nombre: 'Apaseo el Grande', lat: 20.5483, lon: -100.6223 },
    { nombre: 'Atarjea', lat: 21.3185, lon: -99.8171 },
    { nombre: 'Celaya', lat: 20.5235, lon: -100.8157 },
    { nombre: 'Comonfort', lat: 20.7197, lon: -100.7635 },
    { nombre: 'Coroneo', lat: 20.2408, lon: -100.4136 },
    { nombre: 'Cortazar', lat: 20.4812, lon: -100.9605 },
    { nombre: 'Cuerámaro', lat: 20.6328, lon: -101.6466 },
    
    { nombre: 'Doctor Mora', lat: 21.1404, lon: -100.3293 },
    { nombre: 'Dolores Hidalgo', lat: 21.1561, lon: -100.9314 },
    { nombre: 'Guanajuato', lat: 21.0190, lon: -101.2574 },
    { nombre: 'Huanímaro', lat: 20.3746, lon: -101.5064 },
    { nombre: 'Irapuato', lat: 20.6767, lon: -101.3563 },
    { nombre: 'Jaral del Progreso', lat: 20.3728, lon: -101.0625 },
    { nombre: 'Jerécuaro', lat: 20.1373, lon: -100.5142 },
    { nombre: 'León', lat: 21.1221, lon: -101.6827 },
    { nombre: 'Manuel Doblado', lat: 20.7256, lon: -101.9441 },
    { nombre: 'Moroleón', lat: 20.1250, lon: -101.1895 },
    
    { nombre: 'Ocampo', lat: 21.6275, lon: -101.4841 },
    { nombre: 'Pénjamo', lat: 20.4283, lon: -101.7227 },
    { nombre: 'Pueblo Nuevo', lat: 20.5446, lon: -101.3276 },
    { nombre: 'Purísima del Rincón', lat: 21.0338, lon: -101.8777 },
    { nombre: 'Romita', lat: 20.8705, lon: -101.5189 },
    { nombre: 'Salamanca', lat: 20.5717, lon: -101.1918 },
    { nombre: 'Salvatierra', lat: 20.2131, lon: -100.8812 },
    { nombre: 'San Diego de la Unión', lat: 21.4752, lon: -100.8808 },
    { nombre: 'San Felipe', lat: 21.4792, lon: -101.2122 },
    { nombre: 'San Francisco del Rincón', lat: 21.0158, lon: -101.8603 },
    
    { nombre: 'San José Iturbide', lat: 21.0044, lon: -100.3895 },
    { nombre: 'San Luis de la Paz', lat: 21.2966, lon: -100.5174 },
    { nombre: 'Santa Catarina', lat: 21.1969, lon: -100.0536 },
    { nombre: 'Santa Cruz de Juventino Rosas', lat: 20.6419, lon: -101.0143 },
    { nombre: 'Santiago Maravatío', lat: 20.1972, lon: -101.0972 },
    { nombre: 'Silao', lat: 20.9320, lon: -101.4282 },
    { nombre: 'Tarandacuao', lat: 20.0206, lon: -100.5198 },
    { nombre: 'Tarimoro', lat: 20.2884, lon: -100.7456 },
    { nombre: 'Tierra Blanca', lat: 21.0131, lon: -100.3396 },
    { nombre: 'Uriangato', lat: 20.1485, lon: -101.1792 },
    
    { nombre: 'Valle de Santiago', lat: 20.3903, lon: -101.1877 },
    { nombre: 'Victoria', lat: 21.1981, lon: -100.2254 },
    { nombre: 'Villagrán', lat: 20.5294, lon: -100.9979 },
    { nombre: 'Xichú', lat: 21.2978, lon: -100.0565 },
    { nombre: 'San Miguel de Allende', lat: 20.9153, lon: -100.7436 },
    { nombre: 'Yuriria', lat: 20.2025, lon: -101.1342 },
];


// Función para obtener y almacenar datos meteorológicos históricos
const obtenerYGuardarDatosHistoricos = async () => {
    const startDate = '2019-10-11'; // Fecha de inicio
    const endDate = '2024-10-11'; // Fecha de fin

    // Crear promesas para todos los municipios para procesar en paralelo
    const promesasMunicipios = municipios.map(async (municipio) => {
        const { nombre, lat, lon } = municipio;
        let totalInserted = 0;
        let batch = []; // Para agrupar documentos

        console.log(`Iniciando proceso para: ${nombre}`);

        // Crear modelo específico para cada municipio
        const Weather = crearModeloMunicipio(nombre);

        // Solicitar datos para el rango completo de 5 años
        const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${startDate}&end_date=${endDate}&hourly=temperature_2m,relative_humidity_2m,rain,surface_pressure&daily=temperature_2m_max,temperature_2m_min&timezone=auto`;

        try {
            const response = await axios.get(url);
            const data = response.data;

            // Asegurarse de que existan los datos diarios y horarios
            if (data.daily && data.daily.time.length > 0 && data.hourly && data.hourly.time.length > 0) {
                // Iterar sobre cada día dentro de la respuesta
                for (let dayIndex = 0; dayIndex < data.daily.time.length; dayIndex++) {
                    // Crear el array de datos por hora (24 subdocumentos)
                    const hourlyData = [];
                    for (let i = 0; i < 24; i++) {
                        hourlyData.push({
                            hour: i, // La hora del día (0-23)
                            temperature: data.hourly.temperature_2m[(dayIndex * 24) + i],
                            humidity: data.hourly.relative_humidity_2m[(dayIndex * 24) + i],
                            surfacePressure: data.hourly.surface_pressure[(dayIndex * 24) + i],
                            rain: data.hourly.rain[(dayIndex * 24) + i],
                        });
                    }

                    // Crear el documento diario
                    batch.push({
                        date: new Date(data.daily.time[dayIndex]), // Fecha del día
                        temperatureMax: data.daily.temperature_2m_max[dayIndex], // Temperatura máxima
                        temperatureMin: data.daily.temperature_2m_min[dayIndex], // Temperatura mínima
                        hourlyData: hourlyData, // Datos horarios
                        municipio: nombre, // Nombre del municipio
                        lat: lat, // Latitud del municipio
                        lon: lon, // Longitud del municipio
                    });

                    // Insertar en lotes cada 100 documentos
                    if (batch.length === 100) {
                        await Weather.insertMany(batch);
                        totalInserted += batch.length;
                        batch = []; // Vaciar el batch después de insertar
                    }
                }

                // Insertar los documentos restantes del batch
                if (batch.length > 0) {
                    await Weather.insertMany(batch);
                    totalInserted += batch.length;
                }
            }
        } catch (error) {
            console.error(`Error al obtener o guardar datos para ${nombre}: ${error.response ? error.response.data : error.message}`);
        }

        console.log(`Total de datos insertados para ${nombre}: ${totalInserted}`);
        console.log(`Proceso completado para: ${nombre}`);
    });

    // Esperar a que todas las promesas de municipios se completen
    await Promise.all(promesasMunicipios);
};

// Crear un servidor HTTP para servir los datos
const server = http.createServer(async (req, res) => {
    if (req.url === '/weather' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Consulta de datos climáticos aún no implementada');
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Ruta no encontrada.');
    }
});

// Ejecutar el servidor en el puerto 3000
server.listen(3000, () => {
    console.log('Servidor ejecutándose en http://localhost:3000');
    
    // Llamar a la función para obtener y guardar datos meteorológicos históricos
    obtenerYGuardarDatosHistoricos();
});