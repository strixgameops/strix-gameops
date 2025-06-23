import React, { useEffect, useReducer } from "react";
import "shared/table/tableStyling.module.css";
import makeData from "shared/table/makeData";
import Table from "shared/table/Table";
import { randomColor, shortId } from "shared/table/utils";
import { grey } from "shared/table/colors";
import s from './bulkAddEntities.module.css'


function reducer(state, action) {
    switch (action.type) {
      case "add_option_to_column":
        const optionIndex = state.columns.findIndex(
          (column) => column.id === action.columnId
        );
        return {
          ...state,
          skipReset: true,
          columns: [
            ...state.columns.slice(0, optionIndex),
            {
              ...state.columns[optionIndex],
              options: [
                ...state.columns[optionIndex].options,
                { label: action.option, backgroundColor: action.backgroundColor }
              ]
            },
            ...state.columns.slice(optionIndex + 1, state.columns.length)
          ]
        };
      case "set_options_to_column":
        const optionIndex2 = state.columns.findIndex(
          (column) => column.id === action.columnId
        );
        return {
          ...state,
          skipReset: true,
          columns: [
            ...state.columns.slice(0, optionIndex2),
            {
              ...state.columns[optionIndex2],
              options: action.options
            },
            ...state.columns.slice(optionIndex2 + 1, state.columns.length)
          ]
        };
      case "add_row":
        return {
          ...state,
          skipReset: true,
          data: [...state.data, {...state.data[state.data.length-1], index: state.data.length+1, name: '', icon: '', id: ''}]
        };
      case "remove_row":
        let tempState = [...state.data]
        tempState = tempState.filter((row, index) => index !== action.rowIndex)
        tempState = tempState.map((row, index) => ({...row, index: index+1}))
        return {
          ...state,
          skipReset: true,
          data: tempState
        };
      case "update_column_type":
        const typeIndex = state.columns.findIndex(
          (column) => column.id === action.columnId
        );
        switch (action.dataType) {
          case "number":
            if (state.columns[typeIndex].dataType === "number") {
              return state;
            } else {
              return {
                ...state,
                columns: [
                  ...state.columns.slice(0, typeIndex),
                  { ...state.columns[typeIndex], dataType: action.dataType },
                  ...state.columns.slice(typeIndex + 1, state.columns.length)
                ],
                data: state.data.map((row) => ({
                  ...row,
                  [action.columnId]: isNaN(row[action.columnId])
                    ? ""
                    : Number.parseInt(row[action.columnId])
                }))
              };
            }
          case "select":
            if (state.columns[typeIndex].dataType === "select") {
              return {
                ...state,
                columns: [
                  ...state.columns.slice(0, typeIndex),
                  { ...state.columns[typeIndex], dataType: action.dataType },
                  ...state.columns.slice(typeIndex + 1, state.columns.length)
                ],
                skipReset: true
              };
            } else {
              let options = [];
              state.data.forEach((row) => {
                if (row[action.columnId]) {
                  options.push({
                    label: row[action.columnId],
                    backgroundColor: randomColor()
                  });
                }
              });
              return {
                ...state,
                columns: [
                  ...state.columns.slice(0, typeIndex),
                  {
                    ...state.columns[typeIndex],
                    dataType: action.dataType,
                    options: [...state.columns[typeIndex].options, ...options]
                  },
                  ...state.columns.slice(typeIndex + 1, state.columns.length)
                ],
                skipReset: true
              };
            }
          case "text":
            if (state.columns[typeIndex].dataType === "text") {
              return state;
            } else if (state.columns[typeIndex].dataType === "select") {
              return {
                ...state,
                skipReset: true,
                columns: [
                  ...state.columns.slice(0, typeIndex),
                  { ...state.columns[typeIndex], dataType: action.dataType },
                  ...state.columns.slice(typeIndex + 1, state.columns.length)
                ]
              };
            } else {
              return {
                ...state,
                skipReset: true,
                columns: [
                  ...state.columns.slice(0, typeIndex),
                  { ...state.columns[typeIndex], dataType: action.dataType },
                  ...state.columns.slice(typeIndex + 1, state.columns.length)
                ],
                data: state.data.map((row) => ({
                  ...row,
                  [action.columnId]: row[action.columnId] + ""
                }))
              };
            }
          default:
            return state;
        }
      case "update_column_header":
        const index = state.columns.findIndex(
          (column) => column.id === action.columnId
        );
        return {
          ...state,
          skipReset: true,
          columns: [
            ...state.columns.slice(0, index),
            { ...state.columns[index], label: action.label },
            ...state.columns.slice(index + 1, state.columns.length)
          ]
        };
      case "update_cell":
        return {
          ...state,
          skipReset: true,
          data: state.data.map((row, index) => {
            if (index === action.rowIndex) {
              return {
                ...state.data[action.rowIndex],
                [action.columnId]: action.value
              };
            }
            return row;
          })
        };
      case "add_column_to_left":
        const leftIndex = state.columns.findIndex(
          (column) => column.id === action.columnId
        );
        let leftId = shortId();
        return {
          ...state,
          skipReset: true,
          columns: [
            ...state.columns.slice(0, leftIndex),
            {
              id: leftId,
              label: "Column",
              accessor: leftId,
              dataType: "text",
              created: action.focus && true,
              options: []
            },
            ...state.columns.slice(leftIndex, state.columns.length)
          ]
        };
      case "add_column_to_right":
        const rightIndex = state.columns.findIndex(
          (column) => column.id === action.columnId
        );
        const rightId = shortId();
        return {
          ...state,
          skipReset: true,
          columns: [
            ...state.columns.slice(0, rightIndex + 1),
            {
              id: rightId,
              label: "Column",
              accessor: rightId,
              dataType: "text",
              created: action.focus && true,
              options: []
            },
            ...state.columns.slice(rightIndex + 1, state.columns.length)
          ]
        };
      case "delete_column":
        const deleteIndex = state.columns.findIndex(
          (column) => column.id === action.columnId
        );
        return {
          ...state,
          skipReset: true,
          columns: [
            ...state.columns.slice(0, deleteIndex),
            ...state.columns.slice(deleteIndex + 1, state.columns.length)
          ]
        };
      case "enable_reset":
        return {
          ...state,
          skipReset: false
        };
      default:
        return state;
    }
}


const BulkAddEntities = ({
    parentNodesVariants,
    onDataChange,
}) => {

  useEffect(() => {
    dispatch({ type: "set_options_to_column", columnId: 'parentCategory', options: parentNodesVariants })
  }, [parentNodesVariants])
  
const [state, dispatch] = useReducer(reducer, {
    columns: [
        {
          id: "index",
          label: "",
          accessor: "index",
          minWidth: 45,
          width: 45,
          maxWidth: 45,
          editable: false,
          dataType: "rowIndex",
          options: []
        },
        {
          id: "id",
          label: "ID *",
          accessor: "id",
          minWidth: 100,
          dataType: "text",
          editable: true,
          options: []
        },
        {
          id: "name",
          label: "Name *",
          accessor: "name",
          minWidth: 100,
          dataType: "text",
          editable: true,
          options: []
        },
        {
          id: "icon",
          label: "Icon",
          accessor: "icon",
          width: 130,
          dataType: "icon",
          editable: true,
          options: []
        },
        {
          id: "parentCategory",
          label: "Category",
          accessor: "parentCategory",
          dataType: "select",
          editable: true,
          width: 200,
          options: parentNodesVariants
        },
        {
          id: "groupName",
          label: "Group Name",
          accessor: "groupName",
          minWidth: 100,
          dataType: "text",
          editable: true,
          options: []
        },
        {
          id: "iap",
          label: "Can be offer's content",
          accessor: "iap",
          dataType: "bool",
          editable: true,
          width: 90,
          options: []
        },
        {
          id: "currency",
          label: "Is Currency",
          accessor: "currency",
          dataType: "bool",
          editable: true,
          width: 130,
          options: []
        },
        {
          id: 9999998,
          minWidth: 100,
          width: 100,
          label: "Remove",
          editable: true,
          disableResizing: true,
          dataType: "removeRow"
        }
    ],
    data: [],
    skipReset: false,
});


  useEffect(() => {
    dispatch({ type: "enable_reset" });
    onDataChange(state.data)
  }, [state.data, state.columns]);

  return (
    <div className={s.tableContainer}>
      <Table
        columns={state.columns}
        data={state.data}
        dispatch={dispatch}
        skipReset={state.skipReset}
      />
    </div>
  );
}

export default BulkAddEntities