import React, { useState } from 'react';
import { Button, Modal, Box } from '@mui/material';
import TargetChangeContainer from '../TargetChangeContainer';
import { getChangedItemIcon } from '../utils/testUtils';
import s from '../abtesting.module.css';

const TestSubject = ({ 
  test, 
  onSubjectChange, 
  entities, 
  offers, 
  pricing, 
  exchangeRates, 
  exchangeRates_USD, 
  nodeTree, 
  nodeData, 
  game, 
  branch 
}) => {
  const [modalOpen, setModalOpen] = useState(false);

  const isEditable = !Boolean(test.startDate);

  return (
    <div className={s.changedFieldsBody}>
      <Button
        onClick={() => setModalOpen(true)}
        variant="outlined"
        sx={{ width: "150px", height: "150px", borderRadius: "1rem" }}
      >
        {getChangedItemIcon(test.subject, entities, offers)}
      </Button>
      
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
        <Box sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "90%",
          maxWidth: "1200px",
          height: "90vh",
          maxHeight: "800px",
          bgcolor: "var(--bg-color3)",
          border: "1px solid #625FF440",
          boxShadow: "0px 0px 5px 2px rgba(98, 95, 244, 0.2)",
          borderRadius: "2rem",
          display: "flex",
          flexDirection: "column"
        }}>
          <Box sx={{ 
            flex: 1,
            overflowY: "auto",
            p: 4
          }}>
            <TargetChangeContainer
              test={test}
              onChangeFields={onSubjectChange}
              entities={entities}
              offersList={offers}
              pricing={pricing}
              exchangeRates={exchangeRates}
              exchangeRates_USD={exchangeRates_USD}
              nodeTree={nodeTree}
              nodeData={nodeData}
              gameID={game.gameID}
              branch={branch}
              onClose={() => setModalOpen(false)}
            />
          </Box>
        </Box>
      </Modal>
    </div>
  );
};

export default React.memo(TestSubject);