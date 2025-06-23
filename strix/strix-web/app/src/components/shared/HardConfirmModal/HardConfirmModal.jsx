import React, {useState, useEffect, useRef} from 'react'
import Modal from '@mui/material/Modal';
import Button from '@mui/material/Button';
import { useAlert } from '@strix/alertsContext';
import ConfirmationModal from './ConfirmationModal';

function HardConfirmModal({modalInfo, onConfirm}) {

    const {triggerAlert} = useAlert();
    
    const modalInfoRef = React.useRef(null);
    // modalInfoLocal: {
    //   title: "Undo game deletion",
    //   bodyText: `Type "${string}" to cancel deletion`,
    //   confirmString: string,
    //   alertMessage: 'Game deletion is canceled successfully',
    // }


    const [openConfirmModal, setOpenConfirmModal] = useState(false);
    const handleOpenConfirmModal = (modalInfoLocal) => {
        // if (!modalInfoLocal.open) {
        //     handleCloseConfirmModal()
        //     return;
        // }
        modalInfoRef.current = modalInfoLocal
        setOpenConfirmModal(true);
    };
    useEffect(() => {
        if (modalInfo) {
            handleOpenConfirmModal(modalInfo)
        }
    }, [modalInfo])
    const handleCloseConfirmModal = () => {
      setOpenConfirmModal(false);
    };
    function confirmAction() {
      triggerAlert(modalInfoRef.current.alertMessage)
      handleCloseConfirmModal()
      onConfirm()
    }

  return (
    <div>
        {modalInfoRef.current && (
        <Modal
          open={openConfirmModal}
          onClose={handleCloseConfirmModal}
        >
            <ConfirmationModal 
            onConfirm={confirmAction} 
            onCancel={handleCloseConfirmModal} 
            bodyText={modalInfoRef.current.bodyText}
            title={modalInfoRef.current.title}
            confirmString={modalInfoRef.current.confirmString}
            />
        </Modal>
        )}
    </div>
  )
}

export default HardConfirmModal