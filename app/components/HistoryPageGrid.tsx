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
  ClientSideRowModelApiModule,
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
  SelectEditorModule,
  IFilterOptionDef,
  ITextFilterParams,
  SortIndicatorComp,
  ColumnApiModule,
  RowApiModule,
  RenderApiModule,
  ScrollApiModule,
  ExternalFilterModule,
} from "ag-grid-community";
import "ag-grid-community/styles/ag-theme-quartz.css";

import { DTPicker } from "./DTPicker";
import { format, toZonedTime } from "date-fns-tz";
import { ArrowPathIcon, ChartBarIcon, QuestionMarkCircleIcon } from "@heroicons/react/24/solid";

ModuleRegistry.registerModules([
  NumberEditorModule,
  TextEditorModule,
  ClientSideRowModelModule,
  ClientSideRowModelApiModule,
  PaginationModule,
  CustomFilterModule,
  DateFilterModule,
  NumberFilterModule,
  RowSelectionModule,
  TextFilterModule,
  CellStyleModule,
  ValidationModule,
  SelectEditorModule,
  ColumnApiModule,
  RowApiModule,
  RenderApiModule,
  ScrollApiModule,
  ExternalFilterModule,
]);

import Dialog from "./HistoryPageDialog";
import { dropdownValues } from 'src/dropdown-values';
import { dropdownMap } from 'src/dropdown-mapping';
import { is, ne } from "drizzle-orm";


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

  const nameFilterOptions: IFilterOptionDef[] = (dropdownValues.name).map((name) => ({
    displayKey: `is_${name}`,
    displayName: `${name}`,
    predicate: (_, cellValue) => cellValue === name,
    numberOfInputs: 0,
  }));
  
  const nameFilterParams: ITextFilterParams = {
    defaultOption: "equals",
    filterOptions: ["equals", ...nameFilterOptions],
  };

  const unitFilterOptions: IFilterOptionDef[] = (dropdownValues.unit).map((unit) => ({
    displayKey: `is_${unit}`,
    displayName: `${unit}`,
    predicate: (_, cellValue) => cellValue === unit,
    numberOfInputs: 0,
  }));
  
  const unitFilterParams: ITextFilterParams = {
    defaultOption: "equals",
    filterOptions: ["equals", ...unitFilterOptions],
  };

  const [dialog, setDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "",
    onConfirm: null
  });

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

  const handleCellNameChanged = (params: any) => {
    if (params.colDef.field === "name") {
      const selectedName = params.newValue;
      const correspondingUnit = dropdownMap[selectedName] || "";

      if (params.data.unit !== correspondingUnit) {
        params.node.setDataValue("unit", correspondingUnit);
      }
    }
  };

  const onSelectionChanged = () => {
    const selectedRows = gridApiRef.current?.getSelectedRows();
    setSelectedRows(selectedRows || []);
  };

  const handleDeleteSelectedRows = () => {
    setDialog({
      isOpen: true,
      title: "Confirm Delete",
      message: "Are you sure you want to delete these entries?",
      type: "warning",
      onConfirm: () => deleteSelectedRows(),
    });
  };

  const deleteSelectedRows = async () => {
    const selectedRows = gridApiRef.current?.getSelectedRows() || [];
    const selectedRowIds = selectedRows.map((row) => row.id);

    if (selectedRowIds.length > 0) {
      const date = format(new Date(), "yyyy-MM-dd HH:mm:ss");
    
      try {
        await fetch(`/api/deleteData`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: selectedRowIds, date: date }),
        });
      
        setRowData((prev) => prev.filter((row) => !selectedRowIds.includes(row.id)));
        
        setDialog({
          isOpen: true,
          title: "Success",
          message: "The selected entries have been deleted.",
          type: "success",
          onConfirm: null
        });

        fetchData();
      } 
      catch (error) {
        console.error("Error deleting rows: ", error);
        setDialog({
          isOpen: true,
          title: "Error",
          message: "There was an error in deleting the selected entries.",
          type: "error",
          onConfirm: null
        });
      }
    }
    else {
      setDialog({
        isOpen: true,
        title: "Error",
        message: "There were no rows selected for deletion.",
        type: "error",
        onConfirm: null
      });
    }
  };  

const handleCreateRow = async () => {
  const date = format(new Date(), "yyyy-MM-dd HH:mm:ss");

  const newRow = {
    id: Date.now(), // Temporary ID, will be replaced by DB
    datetime: date,
    name: "",
    unit: "",
    value: 0,
    isNewRow: true,
  };

  setRowData((prev) => {
    return [newRow, ...prev.map((row) => ({ ...row }))];
  });

  setTimeout(() => {
    gridApiRef.current?.refreshClientSideRowModel("sort");

    setTimeout(() => {
      const displayedRowCount = gridApiRef.current?.getDisplayedRowCount() || 0;

      for (let i = 0; i < displayedRowCount; i++) {
        const rowNode = gridApiRef.current?.getDisplayedRowAtIndex(i);
        if (rowNode?.data?.isNewRow) {
          gridApiRef.current?.ensureIndexVisible(i, "top");
          gridApiRef.current?.startEditingCell({
            rowIndex: i,
            colKey: "name",
          });
          break;
        }
      }
    }, 50);
  }, 0);
};
  
const saveChanges = async () => {
  try {
    const editedRowList = Object.values(editedRows);
    const unsavedNewRows = editedRowList.filter((row) => row.isNewRow);
    const rowsToUpdate = editedRowList.filter((row) => !row.isNewRow);
    var error = null;

    if (unsavedNewRows.length > 0) {
      for (let i = 0; i < unsavedNewRows.length; i++) {
        const newRow = unsavedNewRows[i];
        const newRowData = { ...newRow };

        const createResponse = await fetch("/api/createData", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newRowData),
        });
  
        if (!createResponse.ok) {
          error = new Error("Failed to create new rows.");
        }
        else {
          const result = await createResponse.json();
  
          setRowData((prev) => [
            { ...newRow, id: result.id },
            ...prev,
          ]);
        }
      }
    }

    if (rowsToUpdate.length > 0) {
      const updateResponse = await fetch("/api/updateData", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates: Object.values(rowsToUpdate) }),
      });

      if (!updateResponse.ok) {
        error = new Error("Failed to update rows in database.");
      }
    }

    if (!error) {
      setDialog({
        isOpen: true,
        title: "Success",
        message: "All changes have been saved.",
        type: "success",
        onConfirm: null
      });
    }
    else {
      console.error("Error saving changes: ", error);
      setDialog({
        isOpen: true,
        title: "Error",
        message: "There was an error in saving the changes.",
        type: "error",
        onConfirm: null
      });
    }

    setEditedRows({});
    fetchData();
  }
  catch (error) {
    console.error("Error saving changes: ", error);
    setDialog({
      isOpen: true,
      title: "Error",
      message: "There was an error in saving the changes.",
      type: "error",
      onConfirm: null
    });
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
        "UTC",
        "yyyy-MM-dd HH:mm:ss"
      ),
      value: Number(item.value)
    }))
  );
}

useEffect(() => {
  fetchData();
}, []);

const handleGuideClick = () => {
  setDialog({
    isOpen: true,
    title: "How to Use",
    message: "",
    type: "guide",
    onConfirm: null
  });
};

return (
    <div className="relative flex gap-8 mt-6">
      {/* Left Panel: Ag Grid */}
      <div className="flex-1 rounded-lg p-4 overflow-visible" style={{ marginRight: "35%" }}>
        <div className="ag-theme-quartz" style={{ height: "600px" }}>
          <AgGridReact
            rowData={rowData}
            rowSelection={"multiple" as any}
            suppressRowClickSelection={true}
            onSelectionChanged={onSelectionChanged}
            columnDefs={useMemo(
              () => {
                const gridColumns = [
                  {
                    headerName: "",
                    checkboxSelection: true,
                    headerCheckboxSelection: true,
                    width: 40,
                    suppressMenu: true,
                    pinned: "left" as "left",
                    editable: false,
                    filter: false,
                  },                  
                  {
                    field: "datetime",
                    sortable: true,
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
                    filterParams: nameFilterParams, 
                    onCellValueChanged: handleCellNameChanged,
                    cellEditor: "agSelectCellEditor",
                    cellEditorParams: {
                      "values": dropdownValues.name,
                      valueListGap: 10
                    },
                    editable: (params) => params.data?.isNewRow && isEditing,
                  },
                  {
                    field: "unit",
                    filterParams: unitFilterParams, 
                    editable: (params) => params.data?.isNewRow && isEditing,
                  },
                  {
                    field: "value",
                    filter: "agNumberColumnFilter",
                    filterParams: {
                      buttons: ["apply", "clear", "reset"],
                      defaultOption: "equals"
                    },
                    editable: (params) => params.data?.isNewRow || isCellEditable,
                    onCellValueChanged: handleCellValueChanged,
                    valueParser: (data) => {
                      const newValue = parseFloat(data.newValue);
                      return isNaN(newValue) ? 0 : newValue;
                    },
                    valueFormatter: (params) => {
                      return params.value != null ? Number(params.value).toString() : '';
                    }
                  }
                ];

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
              }
            }}
            domLayout="autoHeight"
            pagination={true}
            paginationPageSize={10}
            paginationPageSizeSelector={[10, 20, 50, 100]}
            onGridReady={(params) => {
              gridApiRef.current = params.api;
              params.api.applyColumnState({
                state: [
                    {
                        colId: "datetime",
                        sort: "desc"
                    }
                ]
            });
            }}
            postSortRows= {(params) => {
              let rowNodes = params.nodes;
              let nextInsertPos = 0;

              for (let i = 0; i < rowNodes.length; i++) {
                  const isNewRow = rowNodes[i].data.isNewRow;
                  if (isNewRow) {
                      rowNodes.splice(nextInsertPos, 0, rowNodes.splice(i, 1)[0]);
                      nextInsertPos++;
                  }
              }
            }}
            isExternalFilterPresent={() => true}
            doesExternalFilterPass={(node) => {
              if (node.data?.isNewRow) {
                return true;
              }
              return true;
            }}
            components={{
              agDateInput: DTPicker,
            }}
          />
        </div>
      </div>

      {/* Right Panel: Actions */}
      <div className="fixed top-24 right-6 w-[28vw] max-w-[700px] min-w-[260px] bg-white drop-shadow-gray drop-shadow-lg rounded-lg shadow-md max-h-[80vh] overflow-y-auto mx-7 mt-6">
        <div className="flex flex-col h-full justify-start">
          <div className="bg-teal drop-shadow-gray drop-shadow-lg rounded-lg p-4">
            <h2 className="flex justify-center text-xl text-white font-semibold">Actions</h2>
          </div>
          <div className="flex flex-col gap-4 p-6">
            <button
              onClick={handleGuideClick}
              className="bg-medium-teal outline outline-1 outline-dark-teal drop-shadow-xl text-white font-medium px-4 py-2 rounded-xl shadow hover:bg-dark-teal"
              style={{
                padding: "8px 16px",
                fontSize: "16px",
                color: "white",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <QuestionMarkCircleIcon className="w-6 h-6 text-gray-600 hover:text-gray-800 cursor-pointer mr-2" />
              How to Use
            </button>

            <button
              onClick={() => gridApiRef.current?.setFilterModel(null)}
              className="bg-light-gray outline outline-1 outline-medium-gray drop-shadow-xl text-gray font-medium px-4 py-2 rounded-xl hover:bg-medium-gray"
            >
              Clear Filters
            </button>

            <button
              onClick={fetchData}
              className="bg-orange text-white outline outline-1 outline-dark-orange drop-shadow-xl font-medium px-4 py-2 rounded-xl shadow hover:bg-dark-orange"
              style={{
              padding: "8px 16px",
              fontSize: "16px",
              color: "white",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              }}
            >
              <ArrowPathIcon className="w-6 h-6 text-gray-600 hover:text-gray-800 cursor-pointer mr-2" />
              Refresh
            </button>

            {isAdmin && (
            <div className="w-full flex flex-col gap-2">
              <button
                onClick={() => setIsEditing((prev) => !prev)}
                className="bg-neutral-600 text-white font-medium px-4 py-2 rounded-xl shadow hover:bg-neutral-700"
              >
                {isEditing ? "Exit Edit Mode" : "Enter Edit Mode"}
              </button>

              {isEditing && (
                <div className="w-full flex flex-col gap-3 bg-light-teal p-4 rounded-lg mt-2">
                  <div className="w-1/3 bg-teal text-white font-semibold text-center p-1 rounded-xl">Edit Controls</div>
                  <button
                  onClick={handleCreateRow}
                  className={`bg-white outline outline-1 outline-dark-orange drop-shadow-xl text-orange font-semibold px-4 py-2 rounded-xl shadow 
                            ${(selectedRows.length > 0) ? "opacity-50 cursor-not-allowed" : "hover:bg-light-orange"}`}
                  disabled={selectedRows.length > 0}
                  >Create
                  </button> 

                  <button
                  onClick={handleDeleteSelectedRows}
                  className={`bg-white outline outline-1 outline-red-500 drop-shadow-xl text-red-500 font-semibold px-4 py-2 rounded-xl shadow hover:bg-red-200
                            ${(selectedRows.length === 0) ? "opacity-50 cursor-not-allowed" : "hover:bg-light-orange"}`}   
                  disabled={selectedRows.length === 0}
                  >Delete Selected
                  </button> 

                  <button
                  onClick={saveChanges}
                  className="bg-white outline outline-1 outline-green-500 drop-shadow-xl text-green-500 font-semibold px-4 py-2 rounded-xl shadow hover:bg-green-200"
                  disabled={Object.keys(editedRows).length === 0}
                  >Save Changes
                  </button> 
                </div>
              )}
            </div>
            )}
          </div>
        </div>
      </div>

      <Dialog
        isOpen={dialog.isOpen}
        title={dialog.title}
        message={dialog.message}
        type={dialog.type}
        onClose={() => setDialog({ ...dialog, isOpen: false })}
        onConfirm={dialog.onConfirm}
      />
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
