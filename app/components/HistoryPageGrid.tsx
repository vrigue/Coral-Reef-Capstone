"use client";
import React, { useEffect, useState, useMemo, useRef } from "react";
import "../globals.css";
import { AgGridReact } from "ag-grid-react";
import { isUserAdmin } from '../../actions/isUserAdmin';
import { UserProvider, useUser } from "@auth0/nextjs-auth0/client";

import {
  CellClassParams,
  CellStyleModule,
  ClientSideRowModelModule,
  PaginationModule,
  CustomFilterModule,
  DateFilterModule,
  NumberFilterModule,
  TextFilterModule,
  EditableCallbackParams,
  NumberEditorModule,
  ModuleRegistry,
  RowSelectionModule,
  ValidationModule,
  TextEditorModule,
} from "ag-grid-community";
import "ag-grid-community/styles/ag-theme-quartz.css";

import { DTPicker } from "./DTPicker";
import { format, toZonedTime } from "date-fns-tz";
import { ArrowPathIcon, ChartBarIcon } from "@heroicons/react/24/solid";

ModuleRegistry.registerModules([
  NumberEditorModule,
  TextEditorModule,
  ClientSideRowModelModule,
  PaginationModule,
  CustomFilterModule,
  DateFilterModule,
  NumberFilterModule,
  RowSelectionModule,
  TextFilterModule,
  CellStyleModule,
  ValidationModule,
]);

export default function HistoryPageGrid() {

  const { user, error, isLoading } = useUser();
    const [isAdmin, setIsAdmin] = useState(false);
  
    useEffect(() => {
      async function checkAdmin() {
        if (user) {
          const adminStatus = await isUserAdmin();
          setIsAdmin(adminStatus);
        }
      }
      checkAdmin();
      console.log(isAdmin);
    }, [user]);

  const [data, setData] = useState<any[]>([]);
  const [rowData, setRowData] = useState<any[]>([]);
  const gridApiRef = useRef<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedRows, setEditedRows] = useState<Record<number, any>>({});
  const [selectedRows, setSelectedRows] = useState<any[]>([]);

  function isCellEditable(params: EditableCallbackParams | CellClassParams) {
    return isEditing;
  }

  const handleCellValueChanged = (params) => {
    const rowId = params.data.id;

    setEditedRows((prev) => ({
      ...prev,
      [rowId]: { ...params.data, [params.column.getColId()]: params.newValue },
    }));
  };

  const onSelectionChanged = () => {
    const selectedRows = gridApiRef.current?.getSelectedRows();
    setSelectedRows(selectedRows || []);
  };

  const handleDeleteRow = async (params) => {
    const rowId = params.data.id;

    if (!confirm("Are you sure you want to delete this entry?")) return;
  
    try {
      const response = await fetch(`/api/deleteData`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rowId }),
      });
  
      if (!response.ok) throw new Error("Failed to delete row");
  
      setRowData((prev) => prev.filter((row) => row.id !== rowId));

      alert("The selected entry has been deleted.");
    } 
    catch (error) {
      console.error("Error deleting row: ", error);
      alert("There was an error in deleting the selected entry.");
    }
  };

  const handleDeleteSelectedRows = async () => {
    const selectedRows = gridApiRef.current?.getSelectedRows();
    if (!selectedRows || selectedRows.length === 0) return;
  
    if (!confirm("Are you sure you want to delete the selected entries?")) return;
  
    const idsToDelete = selectedRows.map((row) => row.id);
  
    try {
      const response = await fetch(`/api/deleteData`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: idsToDelete }),
      });
  
      if (!response.ok) throw new Error("Failed to delete rows");
  
      setRowData((prev) => prev.filter((row) => !idsToDelete.includes(row.id)));

      alert("The selected entries have been deleted.");
    } catch (error) {
      console.error("Error deleting rows: ", error);
      alert("There was an error in deleting the selected entries.");
    }
  };  

const handleCreateRow = async () => {
  const newRow = {
    id: 0, // Temporary ID, will be replaced by DB
    datetime: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
    name: "",
    type: "",
    value: 0,
    isNewRow: true, // Add isNewRow attribute
  };

  setRowData((prev) => {
    return [newRow, ...prev.map((row) => ({ ...row }))];
  });
};

  
const handleSaveNewRow = async (params) => {
  const rowId = params.data.id;
  const rowToSave = rowData.find((row) => row.isNewRow === true);
  if (!rowToSave) return;

  // Remove isNewRow attribute
  rowToSave.isNewRow = false;

  try {
    const response = await fetch("/api/createData", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rowToSave),
    });

    if (!response.ok) throw new Error("Failed to save row");

    const result = await response.json();

    setRowData((prev) =>
      prev.map((row) => (row.id === 0 ? { ...row, id: result.id } : row))
    );

    alert("The new entry has been created.");
  } 
  catch (error) {
    console.error("Error saving row: ", error);
    alert("There was an error in creating the new entry.");
  }
};
  
  
  const saveChanges = async () => {
    if (Object.keys(editedRows).length === 0) return;
    try {
      const response = await fetch("/api/updateData", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates: Object.values(editedRows) }),
      });
      if (!response.ok) throw new Error("Failed to update database");

      alert("All changes have been saved.");
      setEditedRows({});
      fetchData();
    } 
    catch (error) {
      console.error("Error saving changes: ", error);
      alert("There was an error in saving the changes.");
    }
  };

  async function fetchData() {
    const response = await fetch("/api/data");
    const result = await response.json();
    setData(result);
    setRowData(
      result.map((item) => ({
        ...item,
        datetime: formatInTimeZone(
          item.datetime,
          "America/New_York",
          "yyyy-MM-dd HH:mm:ss"
        ),
      }))
    );
  }

  useEffect(() => {
    fetchData();
  }, []);

  const handleGraphClick = () => {
    window.location.href = "/data";
  };

  return (
    <div className="flex gap-8 mt-6">
      {/* Left Panel */}
      <div
        className="flex flex-col bg-gray-200 p-6 rounded-lg shadow-md"
        style={{
          width: "31%",
          position: "fixed",
          top: "13%",
          height: "73.5vh",
          overflowY: "auto",
          margin: "23px",
        }}
      >
        <div className="flex flex-col h-full justify-start">
          <h2 className="flex justify-center text-xl font-bold text-gray-800 mb-4">
            Actions
          </h2>
          <div className="flex flex-col gap-4">
            <button
              onClick={() => gridApiRef.current?.setFilterModel(null)}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg shadow hover:bg-gray-400"
            >
              Clear Filters
            </button>

            <button
              onClick={fetchData}
              className="bg-medium-teal text-white px-4 py-2 rounded-lg shadow hover:bg-dark-teal"
              style={{
                padding: "8px 16px",
                fontSize: "16px",
                color: "white",
                border: "none",
                borderRadius: "5px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ArrowPathIcon className="w-6 h-6 text-gray-600 hover:text-gray-800 cursor-pointer mr-2" />
              Refresh
            </button>
            <button
              onClick={handleGraphClick}
              className="bg-orange text-white px-4 py-2 rounded-lg shadow hover:bg-dark-orange"
              style={{
              padding: "8px 16px",
              fontSize: "16px",
              color: "white",
              border: "none",
              borderRadius: "5px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              }}
              // onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#EA580C")}
              // onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#FFA500")}
            >
              <ChartBarIcon className="w-6 h-6 text-gray-600 hover:text-gray-800 cursor-pointer mr-2" />
              Graphs
            </button>
            {isAdmin && (
            <div className="w-full flex flex-col gap-2">
              <button
                onClick={() => setIsEditing((prev) => !prev)}
                className="bg-neutral-600 text-white px-4 py-2 rounded-lg shadow hover:bg-neutral-700"
              >
                {isEditing ? "Exit Edit Mode" : "Enter Edit Mode"}
              </button>

              {isEditing && (
                  <button
                  onClick={handleCreateRow}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-600"
                >
                  Create
                </button> 
              )}
              {isEditing && (
                  <button
                  onClick={handleDeleteSelectedRows}
                  className="bg-red-500 text-white px-4 py-2 rounded-lg shadow hover:bg-red-600"
                  disabled={selectedRows.length === 0}
                >
                  Delete Selected
                </button> 
              )}
              {isEditing && (
                  <button
                  onClick={saveChanges}
                  className="bg-green-500 text-white px-4 py-2 rounded-lg shadow hover:bg-green-600"
                  disabled={Object.keys(editedRows).length === 0}
                >
                  Save Changes
                </button> 
              )}
            </div>
            )}
          </div>
        </div>
      </div>
      

      {/* Right Panel */}
      <div className="flex-1 rounded-lg p-4" style={{ marginLeft: "33%" }}>
        <div className="ag-theme-quartz" style={{ height: "400px" }}>
          <AgGridReact
            rowData={rowData}
            rowSelection={"multiple" as any}
            onSelectionChanged={onSelectionChanged}
            columnDefs={useMemo(
              () => {
                const gridColumns = [
                  { field: "id", filter: "agNumberColumnFilter" },
                  {
                    field: "datetime",
                    filter: "agDateColumnFilter",
                    minWidth: 225,
                    filterParams: {
                      defaultOption: "inRange",
                      inRangeInclusive: true,
                      comparator: timestampFilter,
                    },
                  },
                  {
                    field: "name",
                    filter: "agTextColumnFilter",
                    editable: (params) => params.data?.isNewRow && isEditing,
                  },
                  {
                    field: "type",
                    filter: "agTextColumnFilter",
                    editable: (params) => params.data?.isNewRow && isEditing,
                  },
                  {
                    field: "value",
                    filter: "agNumberColumnFilter",
                    editable: (params) => params.data?.isNewRow || isCellEditable,
                    onCellValueChanged: handleCellValueChanged,
                    valueParser: (data) => {
                      const newValue = parseFloat(data.newValue);
                      return newValue;
                    }
                  }
                ];

                if (isEditing) {
                  gridColumns.push({
                    headerName: "Actions",
                    field: "delete",
                    cellRenderer: (params) => {
                      if (params.data.isNewRow) {
                        return (
                          <button
                            onClick={() => handleSaveNewRow(params)}
                            className="bg-green-500 text-white text-xs px-1 py-0.5 w-14 h-6 rounded shadow hover:bg-green-600"
                          >
                            Save
                          </button>
                        );
                      }

                      return (
                        <button
                          onClick={() => handleDeleteRow(params)}
                          className="bg-red-500 text-white text-xs px-1 py-0.5 w-14 h-6 rounded shadow hover:bg-red-600"
                        >
                          Delete
                        </button>
                      );
                    },
                    width: 80,
                  } as any);
                }

                return gridColumns;
              },
              [isEditing]
            )}
            defaultColDef={{
              flex: 1,
              minWidth: 100,
              resizable: true,
              sortable: true,
              filter: true,
              filterParams: {
                buttons: ["apply", "clear", "reset"],
              },
            }}
            domLayout="autoHeight"
            pagination={true}
            paginationPageSize={10}
            paginationPageSizeSelector={[10, 20, 50, 100]}
            onGridReady={(params) => {
              gridApiRef.current = params.api;
            }}
            components={{
              agDateInput: DTPicker,
            }}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Credit: https://javascript.plainenglish.io/how-to-create-a-datetime-filter-in-ag-grid-react-e2e1ba2fc80
 * Timestamp filter function to be passed to comparator
 * in column definition
 * @param { * } filterLocalDate - Date to filter by
 * @param { * } cellValue - Date from table cell
 * @returns 0 | 1 | -1
 */
function timestampFilter(filterLocalDate, cellValue) {
  if (!cellValue) return -1;

  filterLocalDate = new Date(filterLocalDate);
  const filterBy = filterLocalDate.getTime();

  try {
    const filterMe = new Date(cellValue).getTime();

    if (filterBy === filterMe) return 0;
    return filterMe < filterBy ? -1 : 1;
  } catch (error) {
    console.error("Invalid datetime format:", cellValue);
    return -1; // default to -1 for invalid dates
  }
}

function formatInTimeZone(
  datetime: any,
  timeZone: string,
  formatString: string
) {
  const zonedDate = toZonedTime(datetime, timeZone);
  return format(zonedDate, formatString, { timeZone });
}
