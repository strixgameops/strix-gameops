#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

if [ -f "passwords.txt" ]; then
    echo -e "${RED}Error: passwords.txt already exists!${NC}"
    exit 1
fi

generate_password() {
    local length=${1:-32}
    # Use alphanumeric
    tr -dc 'A-Za-z0-9' < /dev/urandom | head -c $length
}

# Generate passwords
echo "Generating secure passwords..."
MONGO_PASSWORD=$(generate_password 32)
POSTGRES_PASSWORD=$(generate_password 32)
REDIS_PASSWORD=$(generate_password 32)
SECRET_KEY=$(generate_password 64)
JWT_SECRET=$(generate_password 64)

echo -e "${YELLOW}Generated passwords:${NC}"
echo "MONGO_PASSWORD: $MONGO_PASSWORD"
echo "POSTGRES_PASSWORD: $POSTGRES_PASSWORD"
echo "REDIS_PASSWORD: $REDIS_PASSWORD"
echo "SECRET_KEY: $SECRET_KEY"
echo "JWT_SECRET: $JWT_SECRET"
echo ""

# Function to update env file
update_env_file() {
    local file=$1
    
    if [ ! -f "$file" ]; then
        echo -e "${RED}Warning: $file not found, skipping...${NC}"
        return
    fi
    
    echo "Updating $file..."
        
    # Update passwords in file
    sed -i.tmp \
        -e "s/YOUR_MONGO_PASSWORD/$MONGO_PASSWORD/g" \
        -e "s/YOUR_POSTGRES_PASSWORD/$POSTGRES_PASSWORD/g" \
        -e "s/YOUR_REDIS_PASSWORD/$REDIS_PASSWORD/g" \
        -e "s/YOUR_SECRET_KEY/$SECRET_KEY/g" \
        -e "s/YOUR_JWT_SECRET/$JWT_SECRET/g" \
        "$file"
    
    # Remove temp file
    rm -f "${file}.tmp"
    
    echo -e "  ${GREEN}Updated successfully${NC}"
}

# Update docker-compose.yaml
if [ -f "docker-compose.yaml" ]; then
    echo "Updating docker-compose.yaml..."
    
    sed -i.tmp \
        -e "s/YOUR_MONGO_PASSWORD/$MONGO_PASSWORD/g" \
        -e "s/YOUR_POSTGRES_PASSWORD/$POSTGRES_PASSWORD/g" \
        -e "s/YOUR_REDIS_PASSWORD/$REDIS_PASSWORD/g" \
        "docker-compose.yaml"
    
    rm -f "docker-compose.yaml.tmp"
    echo -e "  ${GREEN}Updated successfully${NC}"
else
    echo -e "${RED}Warning: docker-compose.yaml not found${NC}"
fi

# Update MongoDB init script
if [ -f "seed/mongo-init/init-user.js" ]; then
    echo "Updating seed/mongo-init/init-user.js..."
    
    sed -i.tmp \
        -e "s/YOUR_MONGO_PASSWORD/$MONGO_PASSWORD/g" \
        "seed/mongo-init/init-user.js"
    
    rm -f "seed/mongo-init/init-user.js.tmp"
    echo -e "  ${GREEN}Updated successfully${NC}"
else
    echo -e "${RED}Warning: seed/mongo-init/init-user.js not found${NC}"
fi

# Update all .env files
ENV_FILES=(
    "env/.env-strix-game-backend-analytics"
    "env/.env-strix-game-backend-cacher"
    "env/.env-strix-game-backend-deployment"
    "env/.env-strix-game-backend-geocoder"
    "env/.env-strix-game-backend-ingester"
    "env/.env-strix-game-backend-liveservices"
    "env/.env-strix-web"
    "env/.env-strix-web-backend"
    ".env-strix-game-backend-analytics"
    ".env-strix-game-backend-cacher"
    ".env-strix-game-backend-deployment"
    ".env-strix-game-backend-geocoder"
    ".env-strix-game-backend-ingester"
    ".env-strix-game-backend-liveservices"
    ".env-strix-web"
    ".env-strix-web-backend"
)

for env_file in "${ENV_FILES[@]}"; do
    update_env_file "$env_file"
done

echo ""
# Save passwords to file
echo "Saving passwords to passwords.txt..."
cat > passwords.txt << EOF
Strix Environment Passwords - Generated $(date)
================================================

MongoDB Password: $MONGO_PASSWORD
PostgreSQL Password: $POSTGRES_PASSWORD
Redis Password: $REDIS_PASSWORD
Encryption Secret Key: $SECRET_KEY
JWT Secret: $JWT_SECRET

Password generator will run again if no passwords.txt is available.
Existence of this file is used to know if passwords were generated.
You can leave it empty though.
EOF

echo -e "${GREEN}Password generation and update completed!${NC}"
echo -e "${GREEN}Passwords saved to passwords.txt${NC}"