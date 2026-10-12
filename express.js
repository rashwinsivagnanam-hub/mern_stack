const express = require('express');
const { randomUUID } = require('node:crypto');

const router = express.Router();
const doctors = new Map();
const requiredFields = [
	'name',
	'clinic',
	'specialization',
	'consultation',
	'experienceYears',
	'acceptingPatients',
	'liscenseNumber',
];
const allowedFields = new Set(requiredFields);

function normalizeText(value) {
	return typeof value === 'string' ? value.trim() : value;
}

function validateDoctor(input, { partial = false } = {}) {
	if (!input || typeof input !== 'object' || Array.isArray(input)) {
		return 'Request body must be a JSON object.';
	}

	const unknownFields = Object.keys(input).filter((field) => !allowedFields.has(field));
	if (unknownFields.length > 0) {
		return `Unknown field(s): ${unknownFields.join(', ')}.`;
	}

	const fieldsToCheck = partial ? Object.keys(input) : requiredFields;
	for (const field of fieldsToCheck) {
		if (field === 'experienceYears') {
			if (!Number.isInteger(input[field]) || input[field] < 0) {
				return 'experienceYears must be a non-negative integer.';
			}
			continue;
		}

		if (field === 'consultation') {
			if (typeof input[field] !== 'number' || !Number.isFinite(input[field]) || input[field] < 0) {
				return 'consultation must be a non-negative number.';
			}
			continue;
		}

		if (field === 'acceptingPatients') {
			if (typeof input[field] !== 'boolean') {
				return 'acceptingPatients must be a boolean.';
			}
			continue;
		}

		if (typeof input[field] !== 'string' || input[field].trim() === '') {
			return `${field} must be a non-empty string.`;
		}
	}

	return null;
}

router.get('/', (req, res) => {
	const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';
	const specialization = typeof req.query.specialization === 'string' ? req.query.specialization.trim().toLowerCase() : '';
	const clinic = typeof req.query.clinic === 'string' ? req.query.clinic.trim().toLowerCase() : '';

	const results = [...doctors.values()].filter((doctor) => {
		const matchesSearch = !search || doctor.name.toLowerCase().includes(search);
		const matchesSpecialization = !specialization || doctor.specialization.toLowerCase() === specialization;
		const matchesClinic = !clinic || doctor.clinic.toLowerCase() === clinic;
		return matchesSearch && matchesSpecialization && matchesClinic;
	});

	res.json({ data: results, count: results.length });
});

router.get('/:id', (req, res) => {
	const doctor = doctors.get(req.params.id);
	if (!doctor) {
		return res.status(404).json({ error: 'Doctor not found.' });
	}
	return res.json({ data: doctor });
});

router.post('/', (req, res) => {
	const validationError = validateDoctor(req.body);
	if (validationError) {
		return res.status(400).json({ error: validationError });
	}
	const doctor = Object.fromEntries(
		Object.entries(req.body).map(([field, value]) => [field, normalizeText(value)]),
	);
	doctor.id = randomUUID();
	doctor.createdAt = new Date().toISOString();
	doctor.updatedAt = doctor.createdAt;
	doctors.set(doctor.id, doctor);

	return res.status(201).json({ data: doctor });
});

router.put('/:id', (req, res) => {
	const existingDoctor = doctors.get(req.params.id);
	if (!existingDoctor) {
		return res.status(404).json({ error: 'Doctor not found.' });
	}

	const validationError = validateDoctor(req.body);
	if (validationError) {
		return res.status(400).json({ error: validationError });
	}
	const updatedDoctor = Object.fromEntries(
		Object.entries(req.body).map(([field, value]) => [field, normalizeText(value)]),
	);
	updatedDoctor.id = existingDoctor.id;
	updatedDoctor.createdAt = existingDoctor.createdAt;
	updatedDoctor.updatedAt = new Date().toISOString();
	doctors.set(updatedDoctor.id, updatedDoctor);

	return res.json({ data: updatedDoctor });
});

router.patch('/:id', (req, res) => {
	const existingDoctor = doctors.get(req.params.id);
	if (!existingDoctor) {
		return res.status(404).json({ error: 'Doctor not found.' });
	}

	const validationError = validateDoctor(req.body, { partial: true });
	if (validationError) {
		return res.status(400).json({ error: validationError });
	}

	const changes = Object.fromEntries(
		Object.entries(req.body).map(([field, value]) => [field, normalizeText(value)]),
	);
	const updatedDoctor = { ...existingDoctor, ...changes };
	updatedDoctor.updatedAt = new Date().toISOString();
	doctors.set(updatedDoctor.id, updatedDoctor);
	return res.json({ data: updatedDoctor });
});

router.delete('/:id', (req, res) => {
	if (!doctors.has(req.params.id)) {
		return res.status(404).json({ error: 'Doctor not found.' });
	}

	doctors.delete(req.params.id);
	return res.status(204).end();
});

module.exports = router;
