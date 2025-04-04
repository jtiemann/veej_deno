// websocket/ws_utils.ts - Utility functions for WebSocket communication
import { base64 } from "https://deno.land/x/b64@1.1.27/src/base64.js";
import { join } from "https://deno.land/std@0.207.0/path/mod.ts";
import { config } from "../config.ts";

/**
 * Format contacts data for response
 */
export function formatContactsResponse(contacts: any[]): string {
  if (!contacts || contacts.length === 0) {
    // Return test data if no contacts found
    return 'test@example.com+?+{"task":{"data":{"name":"Test Contact","avatar":"avatar_placeholder.png"}}}';
  }
  
  try {
    const formattedContacts = contacts.map(contact => {
      const email = contact.email || '';
      const task = contact.task || '{}';
      
      // Ensure task is a string
      const taskStr = typeof task === 'string' ? task : JSON.stringify(task);
      
      return `${email}+?+${taskStr}`;
    });
    
    return formattedContacts.join('||');
  } catch (error) {
    console.error("Error formatting contacts:", error);
    return 'error';
  }
}

/**
 * Format messages data for response
 */
export function formatMessagesResponse(messages: any[]): string {
  if (!messages || messages.length === 0) {
    return '';
  }
  
  try {
    const formattedMessages = messages.map(message => {
      const email = message.email || '';
      const task = message.task || '{}';
      
      // Ensure task is a string
      const taskStr = typeof task === 'string' ? task : JSON.stringify(task);
      
      return `${email}+?+${taskStr}`;
    });
    
    return formattedMessages.join('||');
  } catch (error) {
    console.error("Error formatting messages:", error);
    return 'error';
  }
}

/**
 * Get file response for media requests
 */
export async function getFileResponse(filename: string): Promise<string> {
  try {
    const filePath = join(config.mediaDir, filename);
    
    const fileData = await Deno.readFile(filePath);
    const encodedData = base64.encode(fileData);
    
    return `Media Response! ${filename}::${encodedData}`;
  } catch (error) {
    console.error("Error reading file:", error);
    return "Media Response! error";
  }
}

/**
 * Parse message data to extract necessary information
 */
export function parseMessageData(task: string): { 
  type: string; 
  sendTo: string; 
  respondTo: string; 
  code: string; 
  when: string; 
  email: string; 
  message: string; 
  attachments: any[];
} {
  try {
    const taskObj = JSON.parse(task);
    const taskData = taskObj.task;
    const data = taskData.data || {};
    
    return {
      type: taskData.type || 'vText',
      sendTo: taskData.sendTo || '',
      respondTo: data.respondTo || '',
      code: data.code || '',
      when: data.when || '',
      email: data.email || '',
      message: data.message || '',
      attachments: data.attachments || []
    };
  } catch (error) {
    console.error("Error parsing message data:", error);
    return {
      type: 'vText',
      sendTo: '',
      respondTo: '',
      code: 'error',
      when: '',
      email: '',
      message: '',
      attachments: []
    };
  }
}
