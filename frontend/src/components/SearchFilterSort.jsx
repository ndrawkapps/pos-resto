// frontend/src/components/SearchFilterSort.jsx
import React, { useEffect, useRef, useState } from "react";

/**
 * Props:
 * - searchPlaceholder
 * - filters: [{value,label}]
 * - sorts: [{value,label}]
 * - onSearch(term), onFilter(val), onSort(val)
 */
export default function SearchFilterSort({
  searchPlaceholder = "Search...",
  filters = [],
  sorts = [],
  initialSearch = "",
  initialFilter = "",
  initialSort = "",
  onSearch = () => {},
  onFilter = () => {},
  onSort = () => {},
  className = "",
}) {
  const [q, setQ] = useState(initialSearch);
  const [filter, setFilter] = useState(initialFilter);
  const [sort, setSort] = useState(initialSort);
  const deb = useRef(null);

  useEffect(() => {
    if (deb.current) clearTimeout(deb.current);
    deb.current = setTimeout(() => onSearch(q.trim()), 300);
    return () => clearTimeout(deb.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  useEffect(() => {
    onFilter(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  useEffect(() => {
    onSort(sort);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort]);

  return (
    <div
      className={`d-flex flex-column flex-md-row gap-2 align-items-start align-items-md-center ${className}`}
    >
      <div className="input-group" style={{ minWidth: 220 }}>
        <span className="input-group-text">
          <i className="fa fa-search" />
        </span>
        <input
          type="search"
          className="form-control form-control-sm"
          placeholder={searchPlaceholder}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {q && (
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() => setQ("")}
          >
            <i className="fa fa-times" />
          </button>
        )}
      </div>

      {filters && filters.length > 0 && (
        <select
          className="form-select form-select-sm"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ minWidth: 160 }}
        >
          {filters.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      )}

      {sorts && sorts.length > 0 && (
        <select
          className="form-select form-select-sm"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          style={{ minWidth: 160 }}
        >
          {sorts.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
