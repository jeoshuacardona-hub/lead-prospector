const express = require('express');
const XLSX = require('xlsx');
const { getDb } = require('../db/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * Build the export query with filters applied.
 * Returns { query, params } for use with db.prepare().
 */
function buildExportQuery(filters, userRole, userId) {
  const { city, niche, status, user_id } = filters;

  let conditions = [];
  let params = [];

  // Non-admin can only export their own leads
  if (userRole !== 'admin') {
    conditions.push('l.user_id = ?');
    params.push(userId);
  } else if (user_id) {
    conditions.push('l.user_id = ?');
    params.push(parseInt(user_id));
  }

  if (city) {
    conditions.push('l.city LIKE ?');
    params.push(`%${city}%`);
  }
  if (niche) {
    conditions.push('l.niche LIKE ?');
    params.push(`%${niche}%`);
  }
  if (status) {
    conditions.push('l.status = ?');
    params.push(status);
  }

  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  const query = `
    SELECT
      l.business_name,
      l.city,
      l.niche,
      l.address,
      l.phone,
      l.email,
      l.website,
      l.rating,
      l.reviews_count,
      l.status,
      le.instagram,
      le.facebook,
      le.tiktok,
      le.linkedin,
      le.other_social,
      le.phone_confirm,
      le.business_needs,
      le.weaknesses,
      le.notes,
      u.full_name as asesor,
      l.created_at,
      le.enriched_at
    FROM leads l
    LEFT JOIN lead_enrichments le ON l.id = le.lead_id
    LEFT JOIN users u ON l.user_id = u.id
    ${whereClause}
    ORDER BY l.created_at DESC
  `;

  return { query, params };
}

/**
 * Map database rows to Spanish column names for export.
 */
function mapRowsToExportData(rows) {
  return rows.map(row => ({
    'Negocio': row.business_name || '',
    'Ciudad': row.city || '',
    'Nicho': row.niche || '',
    'Dirección': row.address || '',
    'Teléfono': row.phone || '',
    'Email': row.email || '',
    'Website': row.website || '',
    'Rating': row.rating != null ? row.rating : '',
    'Reseñas': row.reviews_count != null ? row.reviews_count : '',
    'Estado': row.status || '',
    'Instagram': row.instagram || '',
    'Facebook': row.facebook || '',
    'TikTok': row.tiktok || '',
    'LinkedIn': row.linkedin || '',
    'Otra Red Social': row.other_social || '',
    'Teléfono Confirmado': row.phone_confirm || '',
    'Necesidades del Negocio': row.business_needs || '',
    'Falencias Detectadas': row.weaknesses || '',
    'Notas': row.notes || '',
    'Asesor': row.asesor || '',
    'Fecha de Creación': row.created_at || '',
    'Fecha de Enriquecimiento': row.enriched_at || ''
  }));
}

/**
 * Escape a value for CSV output.
 */
function escapeCSV(value) {
  if (value == null) return '';
  const str = String(value);
  // If the value contains a comma, newline, or double quote, wrap it in quotes
  if (str.includes(',') || str.includes('\n') || str.includes('"') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

/**
 * GET /api/export/csv
 * Export leads to CSV file.
 */
router.get('/csv', async (req, res) => {
  try {
    const db = getDb();
    const { query, params } = buildExportQuery(req.query, req.user.role, req.user.id);
    const rows = await db.prepare(query).all(...params);
    const exportData = mapRowsToExportData(rows);

    if (exportData.length === 0) {
      return res.status(404).json({ error: 'No se encontraron leads para exportar' });
    }

    // Build CSV
    const columns = Object.keys(exportData[0]);
    const headerRow = columns.map(escapeCSV).join(',');
    const dataRows = exportData.map(row =>
      columns.map(col => escapeCSV(row[col])).join(',')
    );
    const csv = '\uFEFF' + [headerRow, ...dataRows].join('\n'); // BOM for Excel UTF-8 compatibility

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `leads_export_${timestamp}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error) {
    console.error('CSV export error:', error);
    res.status(500).json({ error: 'Error al exportar CSV' });
  }
});

/**
 * GET /api/export/excel
 * Export leads to Excel (.xlsx) file.
 */
router.get('/excel', async (req, res) => {
  try {
    const db = getDb();
    const { query, params } = buildExportQuery(req.query, req.user.role, req.user.id);
    const rows = await db.prepare(query).all(...params);
    const exportData = mapRowsToExportData(rows);

    if (exportData.length === 0) {
      return res.status(404).json({ error: 'No se encontraron leads para exportar' });
    }

    // Create workbook
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(exportData);

    // Set column widths
    const colWidths = [
      { wch: 30 },  // Negocio
      { wch: 15 },  // Ciudad
      { wch: 20 },  // Nicho
      { wch: 40 },  // Dirección
      { wch: 18 },  // Teléfono
      { wch: 30 },  // Email
      { wch: 35 },  // Website
      { wch: 8 },   // Rating
      { wch: 10 },  // Reseñas
      { wch: 12 },  // Estado
      { wch: 35 },  // Instagram
      { wch: 35 },  // Facebook
      { wch: 35 },  // TikTok
      { wch: 35 },  // LinkedIn
      { wch: 35 },  // Otra Red Social
      { wch: 20 },  // Teléfono Confirmado
      { wch: 40 },  // Necesidades del Negocio
      { wch: 40 },  // Falencias Detectadas
      { wch: 40 },  // Notas
      { wch: 20 },  // Asesor
      { wch: 20 },  // Fecha de Creación
      { wch: 20 },  // Fecha de Enriquecimiento
    ];
    worksheet['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads');

    // Write to buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `leads_export_${timestamp}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    console.error('Excel export error:', error);
    res.status(500).json({ error: 'Error al exportar Excel' });
  }
});

module.exports = router;
