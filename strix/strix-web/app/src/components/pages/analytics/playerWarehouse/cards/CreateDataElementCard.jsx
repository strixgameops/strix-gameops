import React from 'react'
import s from '../css/dataElement.module.css'
const CreateDataElementCard = ({elementType, onClicked}) => {

    function createNewDataElement() {
        onClicked(elementType)
    }

  return (
    <div className={s.dataElementCreateCard} onClick={createNewDataElement}>
        Add new
    </div>
  )
}

export default CreateDataElementCard