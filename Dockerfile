# Usa una imagen base de Node.js
FROM node:18

# Establece el directorio de trabajo en /app
WORKDIR /app

# Copia los archivos de configuración de dependencias de Node.js (package.json y package-lock.json)
COPY package*.json ./

# Instala las dependencias de la aplicación
RUN npm install

# Copia el código fuente completo en el contenedor
COPY . .

# Exponer el puerto 3000 (o el puerto que uses en tu aplicación Node.js)
EXPOSE 3000

# Comando para ejecutar la aplicación
CMD ["node", "cache.js"]