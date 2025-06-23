import React from 'react';
import { 
  Typography, 
  TextField, 
  Box,
  Stack,
  Card,
  CardContent
} from '@mui/material';
import { 
  Email as EmailIcon,
  Chat as SlackIcon,
  Forum as DiscordIcon,
  Notifications as NotificationsIcon
} from '@mui/icons-material';

const AlertingConfiguration = ({
  alertEmail,
  alertSlackWebhook,
  alertDiscordWebhook,
  onEmailChange,
  onSlackChange,
  onDiscordChange,
  disabled = false
}) => {
  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <CardContent sx={{ p: 3 }}>
        <Typography 
          variant="h6" 
          gutterBottom 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1.5,
            mb: 3,
            fontWeight: 600
          }}
        >
          <NotificationsIcon color="primary" />
          Alerting Configuration
        </Typography>
        
        <Stack spacing={3}>
          <TextField
            fullWidth
            label="Alert Email"
            type="email"
            value={alertEmail}
            onChange={(e) => onEmailChange(e.target.value)}
            disabled={disabled}
            placeholder="alerts@yourcompany.com"
            InputProps={{
              startAdornment: (
                <Box sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>
                  <EmailIcon color="action" />
                </Box>
              ),
            }}
          />
          
          <TextField
            fullWidth
            label="Slack Webhook URL"
            value={alertSlackWebhook}
            onChange={(e) => onSlackChange(e.target.value)}
            disabled={disabled}
            placeholder="https://hooks.slack.com/services/..."
            InputProps={{
              startAdornment: (
                <Box sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>
                  <SlackIcon color="action" />
                </Box>
              ),
            }}
          />
          
          <TextField
            fullWidth
            label="Discord Webhook URL"
            value={alertDiscordWebhook}
            onChange={(e) => onDiscordChange(e.target.value)}
            disabled={disabled}
            placeholder="https://discord.com/api/webhooks/..."
            InputProps={{
              startAdornment: (
                <Box sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>
                  <DiscordIcon color="action" />
                </Box>
              ),
            }}
          />
        </Stack>
      </CardContent>
    </Card>
  );
};

export default AlertingConfiguration;