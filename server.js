const express = require('express');
const doctorRoutes = require('./express');

const app = express();
const port = Number(process.env.PORT) || 8080;

app.use(express.json());
app.use('/api/doctors', doctorRoutes);

app.use((err, req, res, next) => {
	if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
		return res.status(400).json({ error: 'Request body contains invalid JSON.' });
	}

	return res.status(500).json({ error: 'Internal server error.' });
});

app.listen(port, () => {
	console.log(`Doctor directory API listening on port ${port}`);
});
