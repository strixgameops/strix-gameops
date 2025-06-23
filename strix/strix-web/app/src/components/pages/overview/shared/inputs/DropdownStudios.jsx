import "../css/overview.css";
import { useState, useRef, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCaretDown } from "@fortawesome/free-solid-svg-icons";

// MUI
import Box from "@mui/material/Box";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";

function DropdownStudios({
  defaultOption,
  studios,
  onStudioChange,
  onStudioCreate,
}) {
  const [selectedOption, setSelectedOption] = useState(defaultOption);
  const [isActive, setIsActive] = useState(false);
  const [isInputActive, setInputActive] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const [dropdownOptions, setDropdownOptions] = useState([]);
  // const options = studios.map((studio) => ({
  //   studioID: studio.studioID,
  //   studioName: studio.studioName,
  // }));

  useEffect(() => {
    if (studios.length === 0) {
      setDropdownOptions([]);
    } else {
      setDropdownOptions(
        studios.map((studio) => ({
          studioID: studio.studioID,
          studioName: studio.studioName,
        }))
      );
    }
  }, [studios]);

  useEffect(() => {
    if (defaultOption === undefined) {
      setSelectedOption("");
    } else {
      setSelectedOption(defaultOption.studioID);
    }
  }, [defaultOption]);

  const handleOptionClick = (option) => {
    if (option.target.value === "addNew") {
      handleAddNew();
      setIsActive(true);
    } else {
      const chosenOption = dropdownOptions.find(
        (p) => p.studioID === option.target.value
      );
      setSelectedOption(option.target.value);
      onStudioChange(chosenOption);
      setIsActive(false);
    }
  };
  const handleAddNew = () => {
    setInputActive(true);
  };

  const handleClickOutside = (event) => {
    if (
      // Do not close dropdown if we clicked on text input.
      event.target.classList.contains("overview-dropdown-item-addnew") ||
      event.target.classList.contains("overview-dropdown-item-input")
    ) {
      return;
    } else {
      setIsActive(false);
      setInputActive(false);
      setInputValue("");
    }
  };

  const handleInputBlur = () => {
    setInputActive(false);
    setInputValue("");
  };
  const handleInputKeyDown = (e) => {
    if (e.key === "Enter") {
      onStudioCreate(inputValue);
      setIsActive(false);
      setInputActive(false);
      setInputValue("");
    }
  };

  return (
    <div className="overview-dropdown" ref={dropdownRef}>
      <FormControl fullWidth size="small">
        <InputLabel>Studio</InputLabel>
        <Select
          onClose={(e) => handleClickOutside(e)}
          open={isActive}
          onOpen={() => setIsActive(true)}
          value={selectedOption}
          label="Studio"
          onChange={handleOptionClick}
          MenuProps={{
            disableScrollLock: true,
          }}
        >
          {dropdownOptions.map((option) => (
            <MenuItem value={option.studioID} key={option.studioID}>
              {option.studioName}
            </MenuItem>
          ))}
          <MenuItem value={"addNew"}>
            {isInputActive ? (
              <input
                ref={inputRef}
                value={inputValue}
                onBlur={handleInputBlur}
                onChange={(e) => setInputValue(e.target.value)}
                className="overview-dropdown-item-input"
                onKeyDown={handleInputKeyDown}
                autoFocus
              />
            ) : (
              <div className="overview-dropdown-item-addnew">
                {" "}
                + Create studio
              </div>
            )}
          </MenuItem>
        </Select>
      </FormControl>
      {/* <div className='overview-dropdown-btn' onClick={e => setIsActive(!isActive)}>
              {defaultOption && defaultOption.studioName !== '' ? (
                //  studioName  ,  
                defaultOption.studioName
              ) : (
                //  studioName ,   
                "Select Studio"
              )}
          <div className="fas fa-caret-down">
          <FontAwesomeIcon icon={faCaretDown} />
          </div>
        </div>
        {isActive && (
          <div className='overview-dropdown-content'>

            {dropdownOptions.map(option => (

              <div key={(option.studioID)} onClick={e => { handleOptionClick(option)}}
                                   
              className='overview-dropdown-item' >{option.studioName}</div>

            ))}
            {isInputActive ? (
                <input ref={inputRef}
                value={inputValue}
                onBlur={handleInputBlur}
                onChange={(e) => setInputValue(e.target.value)}
                className="overview-dropdown-item-input"
                onKeyDown={handleInputKeyDown}
                autoFocus
                />
            ) : (
              <div onClick={e => { handleAddNew()}} className='overview-dropdown-item-addnew' > + Create Studio</div>
            )}
              
          </div>
        )} */}
    </div>
  );
}
export default DropdownStudios;
