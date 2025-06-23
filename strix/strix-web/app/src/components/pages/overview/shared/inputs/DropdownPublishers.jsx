import '../css/overview.css';
import {useState, useRef, useEffect} from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCaretDown } from '@fortawesome/free-solid-svg-icons';

// MUI
import Box from '@mui/material/Box';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';

function DropdownPublishers ({ defaultOption, publishers, onPublisherChange, onPublisherCreate }) {
  const [selectedOption, setSelectedOption] = useState(defaultOption);
  const [isActive, setIsActive] = useState(false);
  const [isInputActive, setInputActive] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  const options = publishers.map((publisher) => ({
    publisherID: publisher.publisherID,
    publisherName: publisher.publisherName,
  }));


  useEffect(() => {
    setSelectedOption(defaultOption.publisherID);
  }, [defaultOption]);

  const handleOptionClick = (option) => {
    if (option.target.value === 'addNew') {
      handleAddNew()
      setIsActive(true)
    } else {
      const chosenOption = options.find(p => p.publisherID === option.target.value)
      setSelectedOption(option.target.value);
      onPublisherChange(chosenOption);
      setIsActive(false)
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
      return

    } else {
      setIsActive(false);
      setInputActive(false);
      setInputValue('');
    }
  };

  const handleInputBlur = () => {
    setInputActive(false);
    setInputValue('');
  };
  const handleInputKeyDown = (e) => {
    if (e.key === "Enter") {
      onPublisherCreate(inputValue);
      setIsActive(false);
      setInputActive(false);
      setInputValue('');
    }
  };

    return (
      <div className='overview-dropdown' ref={dropdownRef}>
        <FormControl fullWidth size="small">
          <InputLabel>Publisher</InputLabel>
          <Select
            onClose={(e) => handleClickOutside(e)}
            open={isActive}
            onOpen={() => setIsActive(true)}
            value={selectedOption}
            label="Publisher"
            onChange={handleOptionClick}
            MenuProps={{
              disableScrollLock: true,
            }}
          >
            {options.map(option => (

            <MenuItem value={option.publisherID} key={option.publisherID}>
              {option.publisherName}
            </MenuItem>
                        
            ))}
            <MenuItem value={'addNew'}>
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
                <div className='overview-dropdown-item-addnew' > + Create publisher</div>
              )}
            </MenuItem>
          </Select>
        </FormControl>
      </div>
    )
}
export default DropdownPublishers;