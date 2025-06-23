export class InventoryService {
  constructor(moduleContainer) {
    this.moduleContainer = moduleContainer;
    this.MAX_SLOTS = 99999999;
  }

  async initialize() {
    if (this.initialized) return;

    this.utilityService = this.moduleContainer.get("utility");
    this.metricsService = this.moduleContainer.get("metrics");
    this.cacherService = this.moduleContainer.get("cacher");
    this.warehouseService = this.moduleContainer.get("warehouse");
    this.segmentService = this.moduleContainer.get("segment");

    this.initialized = true;
    console.log("InventoryService initialized");
  }
  async getInventoryItems(gameID, build, environment, device) {
    try {
      let inventory = await this.cacherService.getCachedInventory(
        gameID,
        build,
        environment,
        device
      );

      if (inventory) {
        return inventory.items;
      } else {
        return [];
      }
    } catch (error) {
      console.error(error);
    }
  }
  async getInventoryItemAmount(
    gameID,
    build,
    environment,
    device,
    nodeID,
    slot
  ) {
    try {
      let inventory = await this.cacherService.getCachedInventory(
        gameID,
        build,
        environment,
        device
      );
      if (!inventory) return "0";

      const items = inventory.items.filter((item) => item.nodeID === nodeID);

      if (slot !== undefined && slot !== null) {
        // Find specific slot
        const found = items.find((item) => item.slot === slot);
        return found ? found.quantity : "0";
      } else {
        // Summ all items
        const total = items.reduce(
          (acc, item) =>
            BigInt(acc) + BigInt(this.trimFloatToInteger(item.quantity)),
          BigInt(0)
        );
        return total.toString();
      }
    } catch (error) {
      console.error(error);
    }
  }
  async addInventoryItem(
    gameID,
    build,
    environment,
    device,
    nodeID,
    amount,
    slot
  ) {
    try {
      let inventory = await this.cacherService.getCachedInventory(
        gameID,
        build,
        environment,
        device
      );
      amount = this.validateNumber(this.trimFloatToInteger(amount));
      let newAmount = amount;

      if (!inventory) {
        // If no inventory present
        const newItem = { nodeID, quantity: amount.toString() };
        if (slot !== undefined && slot !== null) newItem.slot = slot;
        await this.cacherService.createNewInventory(gameID, {
          gameID: gameID,
          branch: build,
          environment: environment,
          clientID: device,
          items: [newItem],
        });
        this.warehouseService.registerPlayerItemInWarehouse(
          gameID,
          build,
          environment,
          device,
          nodeID,
          newItem.quantity
        );
        this.segmentService.recalculateSegments(
          gameID,
          build,
          environment,
          device,
          nodeID,
          false,
          false
        );
        return { success: true, data: newAmount.toString() };
      }

      let items = inventory.items;
      let existingItem = undefined;

      if (slot !== undefined && slot !== null) {
        // If the slot is provided
        existingItem = items.find((item) => item.slot === slot);
        if (existingItem) {
          if (existingItem.nodeID === nodeID) {
            // If slot has the same provided item, increase the quantity
            existingItem.quantity = (
              BigInt(this.trimFloatToInteger(existingItem.quantity)) +
              BigInt(amount)
            ).toString();
            newAmount = existingItem.quantity.toString();
          } else {
            // Slot is taken by another item
            const takenSlotItem =
              await this.cacherService.getCachedEntityByNodeID(
                gameID,
                build,
                existingItem.nodeID,
                returnFullObject
              );
            throw new Error(
              `Slot ${slot} already taken by item with ID: ${takenSlotItem.entityBasic.entityID} (${existingItem.nodeID})`
            );
          }
        } else {
          // Slot is free, create item here
          existingItem = { nodeID, quantity: amount.toString(), slot };
          items.push(existingItem);
          newAmount = existingItem.quantity.toString();
        }
      } else {
        // If slot isn't provided, try to find a slot with the same nodeID
        existingItem = items.find(
          (item) =>
            item.nodeID === nodeID &&
            item.slot !== undefined &&
            item.slot !== null
        );
        if (existingItem) {
          existingItem.quantity = (
            BigInt(this.trimFloatToInteger(existingItem.quantity)) +
            BigInt(amount)
          ).toString();
          newAmount = existingItem.quantity.toString();
        } else {
          // Find the first free slot
          const occupiedSlots = items
            .map((item) => item.slot)
            .filter((s) => s !== undefined);
          let freeSlot = null;
          for (let i = 0; i < this.MAX_SLOTS; i++) {
            if (!occupiedSlots.includes(i)) {
              freeSlot = i;
              break;
            }
          }
          if (freeSlot === null) {
            throw new Error("No free slots in inventory");
          }
          existingItem = {
            nodeID,
            quantity: amount.toString(),
            slot: freeSlot,
          };
          newAmount = existingItem.quantity.toString();
          items.push(existingItem);
        }
      }

      inventory.items = items;
      await this.cacherService.saveInventory(
        gameID,
        build,
        environment,
        device,
        inventory
      );
      this.warehouseService.registerPlayerItemInWarehouse(
        gameID,
        build,
        environment,
        device,
        nodeID,
        existingItem.quantity,
        slot
      );
      this.segmentService.recalculateSegments(
        gameID,
        build,
        environment,
        device,
        nodeID,
        false,
        false
      );
      return { success: true, data: newAmount.toString() };
    } catch (error) {
      console.error(error);
      return { success: false, message: error.message };
    }
  }
  async removeInventoryItem(
    gameID,
    build,
    environment,
    device,
    nodeID,
    amount,
    slot
  ) {
    try {
      let inventory = await this.cacherService.getCachedInventory(
        gameID,
        build,
        environment,
        device
      );
      amount = this.validateNumber(this.trimFloatToInteger(amount));
      let newAmount = amount;
      if (!inventory) return false;

      let items = inventory.items;

      if (slot !== undefined && slot !== null) {
        // If slot is provided
        const idx = items.findIndex(
          (item) => item.nodeID === nodeID && item.slot === slot
        );
        if (idx !== -1) {
          let currentQty = BigInt(this.trimFloatToInteger(items[idx].quantity));
          let removalQty = BigInt(amount);
          if (currentQty > removalQty) {
            items[idx].quantity = (currentQty - removalQty).toString();
            newAmount = items[idx].quantity.toString();
          } else {
            // Remove the item from the inventory if deleted amount is greater or equal
            items.splice(idx, 1);
            newAmount = "0";
          }
        }
      } else {
        // Remove the rest quantity from other slots with the same nodeID
        let removalQty = BigInt(amount);
        // Get all items with the same nodeID
        const itemsForNode = items
          .map((item, index) => ({ ...item, index })) // Store original index
          .filter((item) => item.nodeID === nodeID)
          .reverse(); // Reverse to start from the last slot

        // Remove items from the inventory, starting from the last one
        for (let item of itemsForNode) {
          let currentQty = BigInt(this.trimFloatToInteger(item.quantity));
          if (currentQty >= removalQty) {
            items[item.index].quantity = (currentQty - removalQty).toString();
            removalQty = BigInt(0);
            break;
          } else {
            removalQty -= currentQty;
            items[item.index].quantity = "0";
          }
        }
        // Remove items with 0 quantity
        items = items.filter(
          (item) => BigInt(this.trimFloatToInteger(item.quantity)) > BigInt(0)
        );

        newAmount = BigInt(0);
        for (const obj of items) {
          if (obj.nodeID === nodeID) {
            newAmount += BigInt(this.trimFloatToInteger(obj.quantity));
          }
        }
        newAmount = newAmount.toString();
      }

      inventory.items = items;
      await this.cacherService.saveInventory(
        gameID,
        build,
        environment,
        device,
        inventory
      );
      this.warehouseService.unregisterPlayerItemInWarehouse(
        gameID,
        environment,
        device,
        nodeID
      );
      this.segmentService.recalculateSegments(
        gameID,
        build,
        environment,
        device,
        nodeID,
        false,
        false
      );
      return { success: true, data: newAmount.toString() };
    } catch (error) {
      console.error(error);
      return { success: false, message: error.message };
    }
  }

  validateNumber(str) {
    const check = /^[0-9]+(\.[0-9]+)?$/.test(str);
    if (check) {
      return str;
    } else {
      throw new Error("Invalid number supplied to inventory: " + str);
    }
  }
  trimFloatToInteger(numberString) {
    numberString = numberString.toString();
    const dotIndex = numberString.indexOf(".");
    if (dotIndex === -1) return numberString;
    return numberString.slice(0, dotIndex);
  }
}
