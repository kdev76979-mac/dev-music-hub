const { ZodError } = require('zod');

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

// Prisma unique-constraint / FK error codes we translate into friendly 4xx responses.
function mapPrismaError(err) {
  if (err && err.code === 'P2002') {
    const fields = (err.meta && err.meta.target) || [];
    return { status: 409, message: `That ${fields.join(', ') || 'value'} is already in use.` };
  }
  if (err && err.code === 'P2025') {
    return { status: 404, message: 'The requested item was not found.' };
  }
  if (err && err.code === 'P2003') {
    return { status: 409, message: 'This action conflicts with related data.' };
  }
  return null;
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Invalid input.', details: err.errors.map((e) => ({ path: e.path.join('.'), message: e.message })) });
  }

  const prismaMapped = mapPrismaError(err);
  if (prismaMapped) return res.status(prismaMapped.status).json({ error: prismaMapped.message });

  if (err && err.status) {
    return res.status(err.status).json({ error: err.message || 'Request failed.' });
  }

  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'That file/request is too large.' });
  }

  console.error('Unhandled error:', err);
  return res.status(500).json({ error: 'Something went wrong on our end. Please try again.' });
}

function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Not found.' });
}

module.exports = { asyncHandler, errorHandler, notFoundHandler };
