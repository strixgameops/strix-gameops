#!/bin/bash

# Make script more resilient - don't exit on errors, just log them
# set -e  # Commented out to prevent script from stopping Pulsar

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Function to check if tenant exists
tenant_exists() {
  bin/pulsar-admin tenants list 2>/dev/null | grep -q "^$1$"
  return $?
}

# Function to check if namespace exists
namespace_exists() {
  bin/pulsar-admin namespaces list "$1" 2>/dev/null | grep -q "^$1/$2$"
  return $?
}

# Function to check if topic exists
topic_exists() {
  bin/pulsar-admin topics list "$1" 2>/dev/null | grep -q "$2"
  return $?
}

# Function to safely execute admin commands with retries
safe_admin_command() {
  local command="$1"
  local description="$2"
  local max_attempts=3
  
  for attempt in $(seq 1 $max_attempts); do
    log "Attempting: $description (attempt $attempt/$max_attempts)"
    if eval "$command" 2>/dev/null; then
      log "SUCCESS: $description"
      return 0
    else
      log "FAILED: $description (attempt $attempt/$max_attempts)"
      if [ $attempt -lt $max_attempts ]; then
        sleep 2
      fi
    fi
  done
  
  log "ERROR: $description failed after $max_attempts attempts (non-fatal)"
  return 1
}

# Wait for Pulsar admin to be responsive (with shorter timeout and more attempts)
log "Verifying Pulsar admin connectivity..."
admin_ready=false
for i in {1..20}; do
  if bin/pulsar-admin clusters list >/dev/null 2>&1; then
    log "Pulsar admin is responsive"
    admin_ready=true
    break
  fi
  log "Waiting for Pulsar admin to be ready... (attempt $i/20)"
  sleep 3
done

if [ "$admin_ready" = false ]; then
  log "WARNING: Pulsar admin did not become responsive after 60 seconds"
  log "This is not fatal - Pulsar will continue running, but initialization may be incomplete"
  exit 0  # Exit gracefully without stopping Pulsar
fi

# Verify default cluster exists
log "Verifying standalone cluster exists..."
if ! bin/pulsar-admin clusters list 2>/dev/null | grep -q "standalone"; then
  log "WARNING: Standalone cluster not found - this may indicate Pulsar is still starting up"
  log "Continuing with initialization..."
fi

# Create tenant if it doesn't exist
TENANT="strix-production"
log "Checking tenant '$TENANT'..."
if tenant_exists "$TENANT"; then
  log "Tenant '$TENANT' already exists, skipping creation"
else
  safe_admin_command "bin/pulsar-admin tenants create '$TENANT' --allowed-clusters standalone" "Creating tenant '$TENANT'"
fi

# Create namespaces if they don't exist
NAMESPACES=("analytics" "internal")

for ns in "${NAMESPACES[@]}"; do
  log "Checking namespace '$TENANT/$ns'..."
  if namespace_exists "$TENANT" "$ns"; then
    log "Namespace '$TENANT/$ns' already exists, skipping creation"
  else
    safe_admin_command "bin/pulsar-admin namespaces create '$TENANT/$ns'" "Creating namespace '$TENANT/$ns'"
  fi
done

# Define topics and number of partitions
declare -A TOPICS=(
  ["$TENANT/analytics::events"]=10
  ["$TENANT/analytics::ingest"]=10
  ["$TENANT/internal::massCheckup"]=1
  ["$TENANT/internal::segmentChanged"]=1
  ["$TENANT/internal::pushNotifications"]=1
)

# Create topics if they don't exist
for topic_config in "${!TOPICS[@]}"; do
  namespace=$(echo "$topic_config" | cut -d':' -f1)
  topic_name=$(echo "$topic_config" | cut -d':' -f3)
  partitions=${TOPICS[$topic_config]}
  full_topic="persistent://$namespace/$topic_name"
  
  log "Checking topic '$full_topic'..."
  if topic_exists "$namespace" "$full_topic"; then
    log "Topic '$full_topic' already exists, skipping creation"
  else
    safe_admin_command "bin/pulsar-admin topics create-partitioned-topic '$full_topic' -p '$partitions'" "Creating partitioned topic '$full_topic' with $partitions partitions"
  fi
done

# Verify all topics were created (non-fatal verification)
log "Verifying all topics..."
verification_failed=false
for topic_config in "${!TOPICS[@]}"; do
  namespace=$(echo "$topic_config" | cut -d':' -f1)
  topic_name=$(echo "$topic_config" | cut -d':' -f3)
  full_topic="persistent://$namespace/$topic_name"
  
  if ! topic_exists "$namespace" "$full_topic"; then
    log "WARNING: Topic '$full_topic' was not created properly"
    verification_failed=true
  fi
done

if [ "$verification_failed" = true ]; then
  log "WARNING: Some topics were not created successfully"
  log "You may need to create them manually or re-run this script"
else
  log "All topics verified successfully!"
fi

# Final status report
log "Pulsar initialization completed!"

# Safe status reporting
if bin/pulsar-admin tenants list >/dev/null 2>&1; then
  log "Available tenants: $(bin/pulsar-admin tenants list 2>/dev/null | tr '\n' ' ' || echo 'Unable to list')"
  
  analytics_count=$(bin/pulsar-admin topics list "$TENANT/analytics" 2>/dev/null | wc -l || echo "0")
  internal_count=$(bin/pulsar-admin topics list "$TENANT/internal" 2>/dev/null | wc -l || echo "0")
  
  log "Analytics namespace topics: $analytics_count topics"
  log "Internal namespace topics: $internal_count topics"
else
  log "Admin interface not available for final status report"
fi

log "Initialization script completed - Pulsar will continue running"

# Always exit successfully to not interfere with Pulsar
exit 0