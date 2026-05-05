const express = require('express');
const cors = require('cors');
const yaml = require('yamljs');
const swaggerUi = require('swagger-ui-express');
require('dotenv').config();

const uploadRoutes = require('../src/routes/uploadRoutes');
const swaggerDocument = yaml.load('./swagger.yaml');

const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use('/api', uploadRoutes);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        console.log(`📄 API Documentation at http://localhost:${PORT}/api-docs`);
    });
}

module.exports = app;
