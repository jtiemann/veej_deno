// websocket/ws_handler.ts - WebSocket communication handler
import { serve } from "https://deno.land/std@0.204.0/http/server.ts";
import { base64 } from "https://deno.land/x/b64@1.1.27/src/base64.js";
import { ensureDir } from "https://deno.land/std@0.204.0/fs/ensure_dir.ts";
import { extname, join } from "https://deno.land/std@0.204.0/path/mod.ts";
import { config } from "../config.ts";
import * as dbAccess from "../db/db_access.ts";
import * as fcm from "../services/fcm_service.ts";
import { formatContactsResponse, formatMessagesResponse, getFileResponse } from "./ws_utils.ts";

// Store authenticated clients
const authenticatedClients = new Map<WebSocket, string>();
const connections = new Set<WebSocket>();

export function setupWebSocketServer(port: number): void {
  console.log(`Starting WebSocket server on port ${port}...`);

  // Create a basic HTTP server that upgrades to WebSocket
  serve(handleRequest, { port });
}

async function handleRequest(req: Request): Promise<Response> {
  // Check if the request is for a WebSocket upgrade
  if (req.headers.get("upgrade") === "websocket") {
    // Create WebSocket connection
    const { socket, response } = Deno.upgradeWebSocket(req);
    
    console.log("New WebSocket connection");
    connections.add(socket);
    
    // Set up ping interval
    const pingInterval = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send("ping");
      }
    }, 30000);
    
    // Socket events
    socket.onopen = () => {
      console.log("WebSocket client connected");
    };
    
    socket.onmessage = async (event) => {
      try {
        const message = event.data;
        
        // Handle ping from client
        if (message === "ping") {
          socket.send("pong");
          return;
        }
        
        // Handle pong from client
        if (message === "pong") {
          return;
        }
        
        // Get the prefix to determine the message type
        const prefix = message.substring(0, Math.min(12, message.length));
        console.log(`Received message with prefix: ${prefix}`);
        
        // Handle different message types
        if (prefix === "My PhotoData") {
          await handlePhotoData(socket, message);
        } else if (prefix === "Media Messag") {
          await handleMediaMessage(socket, message);
        } else if (prefix === "authenticate") {
          handleAuthentication(socket, message);
        } else if (prefix === "My Contacts:") {
          await handleGetContacts(socket);
        } else if (prefix === "FCM Message:") {
          handleFcmRegistration(socket, message);
        } else if (prefix === "My Messages:") {
          await handleGetMessages(socket, message);
        } else if (prefix === "All Messages") {
          await handleGetAllMessages(socket, message);
        } else if (prefix === "Send Message") {
          await handleSendMessage(socket, message);
        } else if (prefix === "Add Contact:") {
          await handleAddContact(socket, message);
        } else if (prefix === "Invite Frien") {
          await handleInviteFriend(socket, message);
        } else if (prefix === "Accept Invit") {
          await handleAcceptInvitation(socket, message);
        } else {
          socket.send(`Bad (non-binary Message)! ${message}`);
        }
      } catch (error) {
        console.error("Error handling WebSocket message:", error);
        socket.send(`Error: ${error.message}`);
      }
    };
    
    socket.onclose = () => {
      console.log("WebSocket client disconnected");
      clearInterval(pingInterval);
      connections.delete(socket);
      authenticatedClients.delete(socket);
    };
    
    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
      connections.delete(socket);
      authenticatedClients.delete(socket);
    };
    
    return response;
  }

  // Return a 404 for any other requests
  return new Response("Not Found", { status: 404 });
}

// Handler functions for different message types

async function handlePhotoData(ws: WebSocket, message: string): Promise<void> {
  const parts = message.split("::");
  if (parts.length < 3) {
    ws.send("Error: Invalid photo data message format");
    return;
  }
  
  const guid = parts[1];
  const photoData = parts[2];
  const user = authenticatedClients.get(ws);
  
  if (!user) {
    ws.send("Error: Not authenticated");
    return;
  }
  
  try {
    // Ensure user directories exist
    const userSharedDir = join(config.mediaDir, user, "sharedMedia");
    const userPublicDir = join(config.mediaDir, user, "public_links");
    
    await ensureDir(userSharedDir);
    await ensureDir(userPublicDir);
    
    // Write the files
    const decodedData = base64.decode(photoData);
    const sharedFilePath = join(userSharedDir, `${guid}.jpg`);
    const publicFilePath = join(userPublicDir, `${guid}.jpg`);
    
    await Deno.writeFile(sharedFilePath, decodedData);
    await Deno.writeFile(publicFilePath, decodedData);
    
    ws.send("Photo Saved! ");
  } catch (error) {
    console.error("Error saving photo:", error);
    ws.send(`Error saving photo: ${error.message}`);
  }
}

async function handleMediaMessage(ws: WebSocket, message: string): Promise<void> {
  const parts = message.split("::");
  if (parts.length < 2) {
    ws.send("Error: Invalid media message format");
    return;
  }
  
  const filename = parts[1];
  
  try {
    const response = await getFileResponse(filename);
    ws.send(response);
  } catch (error) {
    console.error("Error handling media message:", error);
    ws.send("Media Response! error");
  }
}

function handleAuthentication(ws: WebSocket, message: string): void {
  const parts = message.split("::");
  if (parts.length < 2) {
    ws.send("Error: Invalid authentication format");
    return;
  }
  
  const user = parts[1];
  // TODO: Implement proper authentication with password verification
  
  // For now, just mark the client as authenticated
  authenticatedClients.set(ws, user);
  ws.send(`Authenticated! ${user}`);
}

async function handleGetContacts(ws: WebSocket): Promise<void> {
  const user = authenticatedClients.get(ws);
  if (!user) {
    ws.send("Error: Not authenticated");
    return;
  }
  
  try {
    const contacts = await dbAccess.getContacts(user);
    const formattedResponse = formatContactsResponse(contacts);
    ws.send(`Contacts Get Complete!  ${formattedResponse}`);
  } catch (error) {
    console.error("Error getting contacts:", error);
    ws.send("Error: Could not retrieve contacts");
  }
}

function handleFcmRegistration(ws: WebSocket, message: string): void {
  const parts = message.split("::");
  if (parts.length < 3) {
    ws.send("Error: Invalid FCM registration format");
    return;
  }
  
  const token = parts[1];
  const user = parts[2];
  
  // Register FCM token
  fcm.registerToken(user, token);
  ws.send(`FCM Token Add! ${user}`);
}

async function handleGetMessages(ws: WebSocket, message: string): Promise<void> {
  const parts = message.split("::");
  if (parts.length < 2) {
    ws.send("Error: Invalid message format");
    return;
  }
  
  const recipient = parts[1];
  const user = authenticatedClients.get(ws);
  
  if (!user) {
    ws.send("Error: Not authenticated");
    return;
  }
  
  try {
    const messages = await dbAccess.getMessages(user, recipient);
    const formattedResponse = formatMessagesResponse(messages);
    ws.send(`Message From Complete!::${recipient}::${formattedResponse}`);
  } catch (error) {
    console.error("Error getting messages:", error);
    ws.send(`Message From Complete!::${recipient}::`);
  }
}

async function handleGetAllMessages(ws: WebSocket, message: string): Promise<void> {
  let since = "1970-01-01T00:00:00.000Z";
  
  // Check if a since timestamp is provided
  if (message.includes("::")) {
    const parts = message.split("::");
    since = parts[1];
  }
  
  const user = authenticatedClients.get(ws);
  if (!user) {
    ws.send("Error: Not authenticated");
    return;
  }
  
  try {
    const messages = await dbAccess.getAllMessages(user, since);
    const formattedResponse = formatMessagesResponse(messages);
    ws.send(`Message Get Complete! ${formattedResponse}`);
  } catch (error) {
    console.error("Error getting all messages:", error);
    ws.send("Error: Could not retrieve messages");
  }
}

async function handleSendMessage(ws: WebSocket, message: string): Promise<void> {
  const parts = message.split("::", 3); // limit to 3 parts to handle the case where the message itself contains ::
  if (parts.length < 3) {
    ws.send("Error: Invalid send message format");
    return;
  }
  
  const recipient = parts[1];
  const task = parts[2];
  
  try {
    // Parse task to extract necessary information
    const taskObj = JSON.parse(task);
    const guid = taskObj.task.data.code;
    const respondTo = taskObj.task.data.respondTo;
    const email = taskObj.task.data.email;
    
    // Use transaction to insert into both tables atomically
    const success = await dbAccess.insertMessageWithTransaction(guid, respondTo, email, task);
    
    if (!success) {
      throw new Error("Failed to insert message");
    }
    
    // Send FCM notification
    fcm.sendNotification(email, respondTo);
    
    ws.send(`Message Sent! ${message}`);
  } catch (error) {
    console.error("Error sending message:", error);
    ws.send(`Error: ${error.message}`);
  }
}
async function handleAddContact(ws: WebSocket, message: string): Promise<void> {
  const parts = message.split("::");
  if (parts.length < 2) {
    ws.send("Error: Invalid add contact format");
    return;
  }
  
  const friendEmail = parts[1];
  let friendName = "";
  
  if (parts.length >= 3) {
    friendName = parts[2];
  }
  
  const user = authenticatedClients.get(ws);
  if (!user) {
    ws.send("Error: Not authenticated");
    return;
  }
  
  try {
    const success = await dbAccess.addContact(user, friendEmail, friendName);
    
    if (success) {
      ws.send(`Contact Added! ${friendEmail}`);
      
      // Refresh contacts list
      const contacts = await dbAccess.getContacts(user);
      const formattedResponse = formatContactsResponse(contacts);
      ws.send(`Contacts Get Complete!  ${formattedResponse}`);
    } else {
      ws.send(`Contact Exists! ${friendEmail}`);
    }
  } catch (error) {
    console.error("Error adding contact:", error);
    ws.send(`Error adding contact: ${error.message}`);
  }
}

/**
 * Handle sending a friend invitation
 */
async function handleInviteFriend(ws: WebSocket, message: string): Promise<void> {
  const parts = message.split("::");
  if (parts.length < 2) {
    ws.send("Error: Invalid invite friend format");
    return;
  }
  
  const friendEmail = parts[1];
  let inviteMessage = "";
  
  if (parts.length >= 3) {
    inviteMessage = parts[2];
  }
  
  const user = authenticatedClients.get(ws);
  if (!user) {
    ws.send("Error: Not authenticated");
    return;
  }
  
  try {
    const success = await dbAccess.sendFriendInvitation(user, friendEmail, inviteMessage);
    
    if (success) {
      ws.send(`Invitation Sent! ${friendEmail}`);
      
      // Send FCM notification
      fcm.sendNotification(friendEmail, user);
    } else {
      ws.send(`Error: Failed to send invitation to ${friendEmail}`);
    }
  } catch (error) {
    console.error("Error sending friend invitation:", error);
    ws.send(`Error sending invitation: ${error.message}`);
  }
}

/**
 * Handle accepting a friend invitation
 */
async function handleAcceptInvitation(ws: WebSocket, message: string): Promise<void> {
  const parts = message.split("::");
  if (parts.length < 2) {
    ws.send("Error: Invalid accept invitation format");
    return;
  }
  
  const invitationGuid = parts[1];
  
  const user = authenticatedClients.get(ws);
  if (!user) {
    ws.send("Error: Not authenticated");
    return;
  }
  
  try {
    const success = await dbAccess.acceptFriendInvitation(invitationGuid);
    
    if (success) {
      ws.send(`Invitation Accepted! ${invitationGuid}`);
      
      // Refresh contacts list
      const contacts = await dbAccess.getContacts(user);
      const formattedResponse = formatContactsResponse(contacts);
      ws.send(`Contacts Get Complete!  ${formattedResponse}`);
    } else {
      ws.send(`Error: Failed to accept invitation ${invitationGuid}`);
    }
  } catch (error) {
    console.error("Error accepting invitation:", error);
    ws.send(`Error accepting invitation: ${error.message}`);
  }
}