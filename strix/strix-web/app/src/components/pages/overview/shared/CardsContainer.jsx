import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Backdrop, CircularProgress } from '@mui/material';
import { useUser } from '@strix/userContext';
import useApi from '@strix/api';
import OverviewCard from './OverviewCard';
import { useGame } from '@strix/gameContext';
import styles from '../css/gameCardsContainer.module.css';

const CardsContainer = ({
  type = 'game', // 'game' or 'studio'
  items = [],
  selectedItem,
  isLoading = false,
  statsData = [],
  onItemSelect,
  onItemOpen,
  onOpenSettingsModal,
  onItemRemove,
  onCreateNew,
  canCreate = false,
}) => {
  const { currentToken, getAccessToken } = useUser();
  const { checkOrganizationAuthority } = useApi();
  const { game } = useGame(); // Get current game from GameContext

  const [selectedCardIndex, setSelectedCardIndex] = useState(null);
  const [showBackdrop, setShowBackdrop] = useState(false);
  const [isAuthority, setIsAuthority] = useState(false);

  const renderedCharts = useRef([]);
  const timeoutRef = useRef(null);

  // Check authority for creating new items
  useEffect(() => {
    const checkAuthority = async () => {
      if (!selectedItem?.studioID || !currentToken) {
        setIsAuthority(false);
        return;
      }

      try {
        const token = await getAccessToken();
        const result = await checkOrganizationAuthority({
          orgID: selectedItem.studioID,
          token,
        });
        setIsAuthority(result.success);
      } catch (error) {
        console.error('Error checking authority:', error);
        setIsAuthority(false);
      }
    };

    checkAuthority();
  }, [selectedItem, currentToken]);

  // Handle backdrop visibility based on loading state and chart rendering
  useEffect(() => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Reset rendered charts when items or type changes
    renderedCharts.current = [];

    // Show backdrop if explicitly loading
    if (isLoading) {
      setShowBackdrop(true);
      return;
    }

    // If not loading and no items, hide backdrop immediately
    if (items.length === 0) {
      setShowBackdrop(false);
      return;
    }

    // If we have items but not loading, show backdrop briefly for chart rendering
    setShowBackdrop(true);

    // Set a timeout to hide backdrop after a reasonable time (3 seconds)
    // This ensures backdrop doesn't stay forever if charts fail to render
    timeoutRef.current = setTimeout(() => {
      setShowBackdrop(false);
    }, 3000);

  }, [items, type, isLoading]);

  // Handle chart rendering for loading state
  const handleChartRendered = useCallback((index) => {
    renderedCharts.current = [...renderedCharts.current, index];
    
    // Hide backdrop when all expected charts are rendered
    if (renderedCharts.current.length >= items.length) {
      setShowBackdrop(false);
      
      // Clear the timeout since we're done loading
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  }, [items.length]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleCardClick = useCallback((index, item) => {
    if (selectedCardIndex === index) {
      // Deselect if already selected
      setSelectedCardIndex(null);
      if (onItemSelect) {
        onItemSelect(null);
      }
    } else {
      // Select new item
      setSelectedCardIndex(index);
      if (onItemSelect) {
        onItemSelect(item);
      }
    }
  }, [selectedCardIndex, type, onItemSelect]);

  const handleOpenSettings = useCallback((itemId) => {
    if (onOpenSettingsModal) {
      onOpenSettingsModal(itemId);
    }
  }, [onOpenSettingsModal]);

  const handleItemRemove = useCallback(() => {
    if (onItemRemove) {
      onItemRemove();
    }
  }, [onItemRemove]);

  const handleCreateNew = useCallback(() => {
    if (onCreateNew) {
      onCreateNew();
    }
  }, [onCreateNew]);

  const handleItemOpen = useCallback((itemId) => {
    if (onItemOpen) {
      onItemOpen(itemId);
    }
  }, [onItemOpen]);

  // Sync selectedCardIndex with current game from GameContext
  useEffect(() => {
    if (type === 'game' && items.length > 0 && game) {
      const index = items.findIndex(item => item.gameID === game.gameID);
      if (index !== -1 && selectedCardIndex !== index) {
        setSelectedCardIndex(index);
      }
    } else if (type === 'game' && !game) {
      setSelectedCardIndex(null);
    }
  }, [type, items, game, selectedCardIndex]);

  const renderSkeletonCards = () => (
    Array.from({ length: 3 }, (_, index) => (
      <OverviewCard key={`skeleton-${index}`} type="skeleton" />
    ))
  );

  const renderCards = () => {
    const cards = items.map((item, index) => {
      const isSelected = type === 'game' 
        ? selectedCardIndex === index
        : selectedItem && selectedItem.studioID === item.studioID;

      const analytics = statsData.find(stat => 
        type === 'game' 
          ? stat.gameID === item.gameID
          : stat.studioID === item.studioID
      );

      return (
        <OverviewCard
          key={type === 'game' ? item.gameID : item.studioID}
          type={type}
          item={item}
          index={index}
          isSelected={isSelected}
          onSelect={handleCardClick}
          onOpen={type === 'studio' ? handleItemOpen : undefined}
          onSettings={handleOpenSettings}
          onRemove={handleItemRemove}
          analyticsData={analytics}
          onChartRendered={handleChartRendered}
          isAuthority={isAuthority}
        />
      );
    });

    // Add create card if user has authority
    if (canCreate && isAuthority) {
      cards.push(
        <OverviewCard
          key="create"
          type="create"
          mode={type}
          onOpen={handleCreateNew}
        />
      );
    }

    return cards;
  };

  return (
    <div className={styles.cardsContainer}>
      <Backdrop
        sx={{ 
          color: '#fff', 
          zIndex: (theme) => theme.zIndex.drawer + 1,
          position: 'absolute',
        }}
        open={showBackdrop}
      >
        <CircularProgress color="inherit" />
      </Backdrop>

      <div className={styles.list}>
        {isLoading ? renderSkeletonCards() : renderCards()}
      </div>
    </div>
  );
};

export default CardsContainer;