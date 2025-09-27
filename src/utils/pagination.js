export function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page || "1", 10) || 1);
  const pageSizeRaw = parseInt(query.pageSize || query.limit || "20", 10) || 20;
  const pageSize = Math.min(100, Math.max(1, pageSizeRaw));
  const offset = (page - 1) * pageSize;
  const limit = pageSize;
  return { page, pageSize, offset, limit };
}
