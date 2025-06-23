import { faker } from '@faker-js/faker';
import {randomColor} from "./utils";

export default function makeData(count) {
  let data = [];
  let options = [];
  // for (let i = 0; i < count; i++) {
  //   let row = {
  //     index: i+1,
  //     firstName: faker.person.firstName(),
  //     lastName: faker.person.lastName(),
  //     email: faker.internet.email(),
  //     age: Math.floor(20 + Math.random() * 20),
  //     music: faker.music.genre()
  //   };
  //   options.push({label: row.music, backgroundColor: randomColor()});

  //   data.push(row);
  // }

  let columns = [
    {
      id: "index",
      label: "",
      accessor: "index",
      minWidth: 40,
      width: 45,
      maxWidth: 60,
      dataType: "number",
      options: []
    },
    {
      id: "id",
      label: "ID",
      accessor: "id",
      minWidth: 100,
      dataType: "text",
      options: []
    },
    {
      id: "name",
      label: "Name",
      accessor: "name",
      minWidth: 100,
      dataType: "text",
      options: []
    },
    {
      id: "icon",
      label: "Icon",
      accessor: "icon",
      width: 130,
      dataType: "text",
      options: []
    },
    {
      id: "iap",
      label: "Is Content",
      accessor: "iap",
      dataType: "select",
      width: 90,
      options: options
    },
    {
      id: "currency",
      label: "Is Currency",
      accessor: "currency",
      dataType: "select",
      width: 130,
      options: options
    },
  ];
  return {columns: columns, data: data, skipReset: false};
}
