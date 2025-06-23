import React, { useState, useMemo } from "react";
import clsx from "clsx";
import {
  useTable,
  useFlexLayout,
  useResizeColumns,
  useSortBy,
  usePagination,
} from "react-table";
import Cell from "./Cell";
import Header from "./Header";
import PlusIcon from "./img/Plus";
import s from "./tableStyling.module.css";
import Typography from "@mui/material/Typography";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { Button } from "@mui/material";
import Popover from "@mui/material/Popover";
import { useTheme } from "@mui/material/styles";
import TablePagination from "@mui/material/TablePagination";

const defaultColumn = {
  minWidth: 50,
  width: 150,
  maxWidth: 400,
  Cell: Cell,
  Header: Header,
  sortType: "alphanumericFalsyLast",
};

export default function Table({
  columns,
  data,
  dispatch: dataDispatch,
  skipReset,
  showAdd = true,
  fixedColumns,
  hiddenColumns,
  filenames,
  gameModelFunctions,

  // Pagination
  page = 0,
  pageSize = 10,
  pageSizeOptions = [5, 10, 25, 50],
  onPageChange,
  onPageSizeChange,
  showPagination = false,
}) {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const theme = useTheme();

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const sortTypes = useMemo(
    () => ({
      alphanumericFalsyLast(rowA, rowB, columnId, desc) {
        if (!rowA.values[columnId] && !rowB.values[columnId]) {
          return 0;
        }

        if (!rowA.values[columnId]) {
          return desc ? -1 : 1;
        }

        if (!rowB.values[columnId]) {
          return desc ? 1 : -1;
        }

        return isNaN(rowA.values[columnId])
          ? rowA.values[columnId].localeCompare(rowB.values[columnId])
          : rowA.values[columnId] - rowB.values[columnId];
      },
    }),
    []
  );

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    page: tablePage,
    prepareRow,
    gotoPage,
    setPageSize,
    state: { pageIndex, pageSize: tablePageSize },
    pageCount,
  } = useTable(
    {
      columns,
      data,
      defaultColumn,
      dataDispatch,
      autoResetSortBy: !skipReset,
      autoResetFilters: !skipReset,
      autoResetRowState: !skipReset,
      sortTypes,
      hiddenColumns,
      fixedColumns,
      filenames,
      gameModelFunctions,
      initialState: { pageIndex: page, pageSize: showPagination ? pageSize : 999999 },
      manualPagination: Boolean(onPageChange),
      pageCount: Math.ceil(data.length / (showPagination ? pageSize : 999999)),
    },
    useFlexLayout,
    useResizeColumns,
    useSortBy,
    usePagination
  );

  function isTableResizing() {
    for (let headerGroup of headerGroups) {
      for (let column of headerGroup.headers) {
        if (column.isResizing) {
          return true;
        }
      }
    }

    return false;
  }

  const open = Boolean(anchorEl);

  return (
    <div className={s.bulkEditTable}>
      {showPagination && (
        <TablePagination
          component="div"
          count={data.length}
          page={onPageChange ? page : pageIndex}
          rowsPerPage={onPageSizeChange ? pageSize : tablePageSize}
          rowsPerPageOptions={pageSizeOptions}
          onPageChange={(event, newPage) => {
            if (onPageChange) {
              onPageChange(newPage);
            } else {
              gotoPage(newPage);
            }
          }}
          onRowsPerPageChange={(event) => {
            const newPageSize = parseInt(event.target.value, 10);
            if (onPageSizeChange) {
              onPageSizeChange(newPageSize);
            } else {
              setPageSize(newPageSize);
            }
          }}
          sx={{
            borderTop: `1px solid ${theme.palette.divider}`,
            ".MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows":
              {
                margin: 0,
              },

            // This param will make sure the pagination is on the left side
            ".MuiTablePagination-spacer": {
              flex: "none",
            },
          }}
        />
      )}

      <div
        {...getTableProps()}
        style={{
          ...getTableProps().style,
          minWidth: hiddenColumns && hiddenColumns.length > 0 ? "100%" : "",
        }}
        className={[s.table + " " + isTableResizing() && s.noselect]}
      >
        <div>
          {headerGroups.map((headerGroup) => (
            <div
              {...headerGroup.getHeaderGroupProps()}
              style={{
                ...headerGroup.getHeaderGroupProps().style,
                minWidth:
                  hiddenColumns && hiddenColumns.length > 0
                    ? "fit-content"
                    : headerGroup.getHeaderGroupProps().style.minWidth,
              }}
              className={`${s.tr}`}
            >
              {headerGroup.headers.map((column) => column.render("Header"))}
            </div>
          ))}
        </div>
        <div {...getTableBodyProps()}>
          {tablePage.map((row, i) => {
            prepareRow(row);
            return (
              <div
                {...row.getRowProps()}
                className={s.tr}
                style={{
                  ...row.getRowProps().style,
                  minWidth:
                    hiddenColumns && hiddenColumns.length > 0
                      ? "fit-content"
                      : row.getRowProps().style.minWidth,
                }}
              >
                {row.cells.map((cell, cI) => {
                  let isCellEditable = columns.find(
                    (c) => c.id === cell.column.id
                  ).editable;
                  let shouldShowOverflow =
                    columns.find((c) => c.id === cell.column.id).dataType ===
                    "select";

                  let isSkipCell =
                    hiddenColumns &&
                    hiddenColumns.includes(cell.column.id) &&
                    !fixedColumns.includes(cell.column.id)
                      ? true
                      : false;
                  if (isSkipCell) {
                    return (
                      <div
                        style={{
                          ...cell.getCellProps().style,
                          flexGrow:
                            hiddenColumns && hiddenColumns.length > 0
                              ? "0"
                              : cell.getCellProps().style.flexGrow,
                          minWidth:
                            hiddenColumns && hiddenColumns.length > 0
                              ? "0"
                              : cell.getCellProps().style.minWidth,
                          width:
                            hiddenColumns && hiddenColumns.length > 0
                              ? "0"
                              : cell.getCellProps().style.width,
                        }}
                      ></div>
                    );
                  }
                  return (
                    <div
                      {...cell.getCellProps()}
                      style={{
                        ...cell.getCellProps().style,
                        flexGrow:
                          hiddenColumns && hiddenColumns.length > 0
                            ? "0"
                            : cell.getCellProps().style.flexGrow,
                        minWidth:
                          hiddenColumns && hiddenColumns.length > 0
                            ? "0"
                            : cell.getCellProps().style.minWidth,
                      }}
                      id={"row" + i + "_cell" + cI}
                      className={`${s.td} 
                  ${!isCellEditable ? s.tdDisabled : ""} 
                  ${shouldShowOverflow ? s.tdOverflow : ""} 
                  `}
                    >
                      {cell.render("Cell")}
                    </div>
                  );
                })}
              </div>
            );
          })}

          {hiddenColumns &&
            hiddenColumns.filter(
              (column) => fixedColumns.indexOf(column) === -1
            ).length > 0 && (
              <Button
                onClick={handleClick}
                sx={{ textTransform: "none", width: "100%" }}
                className={s.hiddenColumnsTooltip}
              >
                <Typography
                  variant={"body1"}
                  color={"text.grey"}
                  sx={{
                    fontSize: "14px",
                    fontWeight: "regular",
                    textAlign: "center",
                  }}
                >
                  Hidden{" "}
                  {
                    hiddenColumns.filter(
                      (column) => fixedColumns.indexOf(column) === -1
                    ).length
                  }{" "}
                  columns
                </Typography>
                <VisibilityIcon sx={{ fontSize: 23 }} />
              </Button>
            )}

          <Popover
            open={open}
            anchorEl={anchorEl}
            onClose={handleClose}
            anchorOrigin={{
              vertical: "bottom",
              horizontal: "left",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                padding: "1rem",
                gap: "0.3rem",
              }}
            >
              <Button
                onClick={() => {
                  dataDispatch({ type: "show_all_columns" });
                  handleClose();
                }}
                sx={{
                  fontWeight: "bold",
                  fontSize: "16px",
                  textTransform: "none",
                  textAlign: "start",
                  alignItems: "start",
                  justifyContent: "start",
                }}
              >
                Show all columns
              </Button>
              {hiddenColumns &&
                hiddenColumns.length > 0 &&
                hiddenColumns
                  .filter((column) => fixedColumns.indexOf(column) === -1)
                  .map((column, index) => (
                    <Button
                      onClick={() => {
                        dataDispatch({ type: "show_column", columnId: column });
                        handleClose();
                      }}
                      sx={{
                        textTransform: "none",
                        textAlign: "start",
                        alignItems: "start",
                        justifyContent: "start",
                      }}
                    >
                      Show "{columns.find((c) => c.id === column).label}"
                    </Button>
                  ))}
            </div>
          </Popover>

          {showAdd && (
            <div
              className={[s.tr + " " + s.addRow]}
              onClick={() => dataDispatch({ type: "add_row" })}
            >
              <span
                className={[s.svgIcon + " " + s.svgGray]}
                style={{ marginRight: 4 }}
              >
                <PlusIcon />
              </span>
              <Typography>Add</Typography>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
