import React, { createContext, useState, useContext } from 'react';

const LocalizationTableContext = createContext();
export const useLocalizationTable = () => useContext(LocalizationTableContext);

export const LocalizationTableProvider = ({ children }) => {
    const [possibleLocalizationTags, setPossibleTags] = useState([]);

    const updatePossibleLocalizationTags = (tags) => {
        setPossibleTags(tags);
    };

    return (
        <LocalizationTableContext.Provider value={{ possibleLocalizationTags, setPossibleLocalizationTags: updatePossibleLocalizationTags }}>
            {children}
        </LocalizationTableContext.Provider>
    );
};
