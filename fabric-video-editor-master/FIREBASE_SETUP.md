# Firebase Setup Guide

This document provides instructions on how to set up Firebase for the Cloud Video Editor project.

## Setting up Firebase Realtime Database

1. Log in to the [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. In the left menu, click "Realtime Database"
4. If you haven't created a database yet, click "Create Database"
   - Choose "Start in test mode" or "Start in locked mode"
   - Select a database location
   - Click "Done"

## Configuring Database Rules

1. On the Realtime Database page, click the "Rules" tab
2. Copy and paste the following rules into the rules editor:

```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null",
    "chats": {
      "$projectId": {
        ".read": "auth != null",
        ".write": "auth != null",
        "messages": {
          ".read": "auth != null",
          ".write": "auth != null",
          "$messageId": {
            ".validate": "newData.hasChildren(['text', 'senderId', 'senderName', 'timestamp', 'projectId'])",
            "text": {
              ".validate": "newData.isString()"
            },
            "senderId": {
              ".validate": "newData.isString() && newData.val() === auth.uid"
            },
            "senderName": {
              ".validate": "newData.isString()"
            },
            "timestamp": {
              ".validate": "newData.isNumber() || newData.val() === now"
            },
            "projectId": {
              ".validate": "newData.isString() && newData.val() === $projectId"
            }
          }
        }
      }
    },
    "projects": {
      "$projectId": {
        ".read": "auth != null",
        ".write": "auth != null",
        "userPresence": {
          ".read": "auth != null",
          ".write": "auth != null",
          "$userId": {
            ".validate": "newData.hasChildren(['displayName', 'lastActive']) && $userId === auth.uid",
            "displayName": {
              ".validate": "newData.isString()"
            },
            "lastActive": {
              ".validate": "newData.isNumber() || newData.val() === now"
            }
          }
        }
      }
    }
  }
}
```

3. Click the "Publish" button to save the rules

## Updating Application Configuration

Ensure your `firebaseConfig.ts` file includes the Realtime Database URL:

```typescript
const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
  databaseURL: ""
};
```

Make sure the `databaseURL` field uses your actual Firebase Realtime Database URL.

## Data Structure

The chat functionality uses the following data structure:

```
/chats/{projectId}/messages/
  - {messageId}: {
      id: string,
      text: string,
      senderId: string,
      senderName: string,
      senderPhotoURL: string,
      timestamp: number,
      projectId: string
    }

/projects/{projectId}/userPresence/
  - {userId}: {
      displayName: string,
      photoURL: string,
      lastActive: timestamp,
      online: boolean
    }
```

This structure allows chat messages and user online status to be organized by project, enabling multiple projects to use the chat functionality simultaneously.
