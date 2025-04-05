var websocket;
$(document).ready(init);

function init() {
//----HELPERS/GLOBALS----//
// --- RENDER RULES -----//
  $('body')    .css("display", "block")
  $('#recip_a').on("click", ()=>$('#sendcv2').trigger('click'))
  $("body")    .on("focus", "#sendmessage textarea", function() {if( ($(this).val()).match(/Send message\.\.\./) ) $(this).val("")})
  $("body")    .on("focus", "#sendmessage2 textarea", function(){if( ($(this).val()).match(/Send message\.\.\./) ) $(this).val("")})
  $("#sendmessage textarea") .focusout(function(){if($(this).val() == "") $(this).val("Send message...")})
  $("#sendmessage2 textarea").focusout(function(){if($(this).val() == "") $(this).val("Send message...")})
// --- END RENDER RULES -----//

// --- START veej GLOBAL OBJECT ---//
  veej      = window.veej || {}
  veej.guid = function () {
    function s4() {
      return Math.floor((1 + Math.random()) * 0x10000)
                 .toString(16)
                 .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-'
           + s4() + '-' + s4() + s4() + s4();
  }

  veej.addToCache = (() => {
    attachmentCache = {}
     return (Arr) => {
      attachmentCache[Arr[0]] = Arr[1]
      //attachmentCache = Object.assign({}, attachmentCache, Obj)
          return attachmentCache
     }
  })()
  veej.checkCache = (Filename) => attachmentCache[Filename] ? attachmentCache[Filename] : false
// --- END veej GLOBAL OBJECT ---//

// --- START OPEN SOCKET ---//
  //$('#server').val("ws://" + window.location.host + "/websocket");

//  $('#server').val("wss://" + "tbone.dyndns-ip.com:8088" + "/websocket");
  $('#server').val("ws://" + "192.168.0.125:8089" + "/websocket"); // Check if this host/port needs updating for deno version

  //$('#server').val("ws://" + "192.168.0.17:8088" + "/websocket");
  if(!("WebSocket" in window)){
       alert("sorry no websockets");
       return
  } else {
      if (memoized_getLoginCredentials()) {
        $("#page1_header").html('<h4 style="text-align:center;">' + memoized_getLoginCredentials() + " Contacts</h4>")
        connect()
      }
      else showLoginPopUp()
  };
  document.addEventListener("deviceready", onDeviceReady, false);
// --- END OPEN SOCKET ---//
window.e_ts = window.e_ts || [];

  // Enhanced all-messages button handler
  $(document).on("click", 'a.all-messages', function(e) {
    e.preventDefault();

    $("#name_header").text("Recent Messages");
    console.log("Getting all messages");

    // Show loading state
    $("#chat-messages-all").html("<p>Loading messages...</p>");

    // Show loader
    if ($("#loader").length) {
      $("#loader").show();
    }

    // Get the starting date for messages (with error handling)
    const since = getStartingDate();
    console.log("Requesting messages since:", since);

    // Send WebSocket request
    sendMsg("All Messages::" + since);

    // Safety timeout to hide loader
    setTimeout(() => {
      if ($("#loader").length && $("#loader").is(":visible")) {
        $("#loader").hide();
      }
    }, 5000);
  });
}

//--- START UTILITY FUNCTIONS ---//
  const memoized_getLoginCredentials = (function () {
    var memoized
    return function() {
      if (memoized) return memoized
      if (localStorage.getItem("user"))  return memoized = localStorage.getItem("user")
            else return false
    }
  })()

  /* const media = (name) => {
       let Msg = "Media Message::" + name
       sendMsg(Msg)
       //websocket.send(Msg);
      }*/

// Enhanced media handling function to replace the existing memoized_media function
const enhancedMediaHandler = (name) => {
  // Check if we already have this image in cache
  if (veej.checkCache(name)) {
    // Create and append image element using cached data
    let i = new Image();
    i.setAttribute("width", "100%");

    // Determine correct data type (PNG or JPEG)
    const cachedData = veej.checkCache(name);
    const isPng = cachedData.match(/\x89PNG/);
    i.src = isPng ? 'data:image/png;base64,' + cachedData :
                    'data:image/jpeg;base64,' + cachedData;

    document.getElementById('imageAttachments').appendChild(i);
    return;
  }

  // Show loading indicator
  const loader = document.getElementById('loader');
  if (loader) {
    loader.style.display = "block";
  }

  // First, try direct HTTP access
  const baseUrl = window.location.protocol + "//" + window.location.host;
  const imgUrl = baseUrl + "/images/" + name;

  let img = new Image();
  img.setAttribute("width", "100%");

  // Set up loading completion callback
  img.onload = function() {
    // Hide loader on successful load
    if (loader) {
      loader.style.display = "none";
    }

    // Add to image attachments
    document.getElementById('imageAttachments').appendChild(img);

    // Cache image for future use (optional - could implement via canvas)
    // toDataURLAndCache(img, name);
  };

  // Set up error handling - fallback to WebSocket approach
  img.onerror = function() {
    console.log("Direct image loading failed, trying WebSocket approach");

    // Fall back to WebSocket approach
    const wsMsg = "Media Message::" + name;
    if (typeof sendMsg === 'function') {
      sendMsg(wsMsg);
    } else {
      console.error("sendMsg function not available");
      if (loader) {
        loader.style.display = "none";
      }
    }
  };

  // Start loading the image
  img.src = imgUrl;
};

// Optional: Function to convert an image to base64 for caching
function toDataURLAndCache(image, filename) {
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;

  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);

  const dataURL = canvas.toDataURL('image/jpeg', 0.8);
  const base64Data = dataURL.split(',')[1];

  // Store in cache
  veej.addToCache([filename, base64Data]);
}

// Function to handle media responses from WebSocket
function handleMediaResponse(responseData) {
  try {
    const imageFilename_Data = responseData.split('Media Response! ')[1];
    if (imageFilename_Data === "error") return null;

    const [imageFilename, imageData] = imageFilename_Data.split("::");

    // Create image element
    let img = new Image();
    img.setAttribute("width", "100%");

    // Determine if PNG or JPEG based on header bytes
    img.src = imageData.match(/\x89PNG/) ?
              'data:image/png;base64,' + imageData :
              'data:image/jpeg;base64,' + imageData;

    // Cache the image data
    veej.addToCache([imageFilename, imageData]);

    // Add to DOM and hide loader
    document.getElementById('imageAttachments').appendChild(img);
    const loader = document.getElementById('loader');
    if (loader) {
      loader.style.display = "none";
    }

    return true;
  } catch (e) {
    console.error("Error handling media response:", e);
    return false;
  }
}

// Improved message renderer function
function renderMessage(e, data) {
  // Clear previous content
  $("#output3").empty();
  $("#imageAttachments").empty();

  // Link detection regex
  const urlRegex = /(https?:\/\/[^\s]+)/g;

  // Get current message index
  let currentMessageIndex = data ? data : parseInt(e.currentTarget.dataset.count);

  // Determine current page and get message data
  let currentPage = $("body").pagecontainer("getActivePage").attr("id");
  let pete;

  switch (currentPage) {
    case "chatview":
      pete = f_ts[currentMessageIndex][1].task.data;
      break;
    case "mesg":
    default:
      pete = e_ts[currentMessageIndex][1].task.data;
      break;
  }

  // Find contact information
  const ethyl = Contacts.filter((unit) => unit[0] == pete.respondTo)
                       .map((unit) => unit[1].task.data.name)
                       .join('');

  // Format timestamp
  const options = {
    weekday: "long", year: "numeric", month: "short",
    day: "numeric", hour: "2-digit", minute: "2-digit"
  };
  const whenFormatted = (new Date(pete.when)).toLocaleTimeString("en-us", options);

  // Set header
  $("#name_header_mesg_detail").text("from " + ethyl);

  // Process message
  const wrapURL = (message) => message.replace(urlRegex,
                                              (url) => `<a href="${url}" target="_blank">${url}</a>`);

  // Add message text with clickable links
  $("#output3").html(wrapURL(pete.message));

  // Add timestamp
  $("#output3").append('<p class="timeMessage"> @ ' + whenFormatted + '</p>');

  // Process attachments
  if (pete.attachments && pete.attachments.length > 0) {
    pete.attachments.forEach(attachment => {
      if (attachment.type === "code") {
        // Handle code attachments
        const codeContent = atob(attachment.data);
        $("#output3").append('<pre>' + codeContent + '</pre>');
      }
      else if (attachment.type === "image/jpeg" || attachment.type === "image/png") {
        // Handle image attachments
        const mediaRequestLocation = `${pete.respondTo}/public_links/${attachment.location}`;
        // Use enhanced media handler
        enhancedMediaHandler(mediaRequestLocation);
      }
    });
  }
}
//--- END UTILITY FUNCTIONS ---//

//--- START SOCKET UTILITIES AND SERVER RESPONSES ---//
  function connect()
  {
      wsHost = $("#server").val()
      websocket = new WebSocket(wsHost);
      showScreen('<b>Connecting to: ' +  wsHost + '</b>');
      websocket.onopen = function(evt) { onOpen(evt) };
      websocket.onclose = function(evt) { onClose(evt) };
      websocket.onmessage = function(evt) { onMessage(evt) };
      websocket.onerror = function(evt) { onError(evt) };
  };

  function disconnect() {
      websocket.close();
  };

  function toggle_connection(){
      if(websocket.readyState == websocket.OPEN){
          disconnect();
      } else {
          connect();
      };
  };

  function sendTxt() {
      if(websocket.readyState == websocket.OPEN){
          txt = $("#send_txt").val();
          websocket.send(txt);
          showScreen('sending: ' + txt);
      } else {
           showScreen('websocket is not connected');
      };
  };

  function sendMsg(Msg) {
    if (!websocket) {
        // WebSocket not initialized yet, try to connect first
        connect();
        // Then queue up the message to be sent after a short delay
        setTimeout(() => sendMsg(Msg), 1500);
        return;
    }
    
    if (websocket.readyState == websocket.OPEN) {
        websocket.send(Msg);
    }
    else {
        connect();
        showScreen('websocket was not connected');
        setTimeout(() => sendMsg(Msg), 1500);
    }
}

  function onOpen(evt) {
      $("#output").empty()
      showScreen('<span style="color: green;">CONNECTED </span>');
      //   TODO: REQUEST LOGIN CREDENTIALS HERE
      let user = memoized_getLoginCredentials()
      //let password = localStorage.getItem("password")
      senderFns(sendMsg,"authenticate::" + user + "::" + "todo:psw"); // Password not used in deno version
      $("#connected").fadeIn('slow');
      $("#content").fadeIn('slow');
  };

  function onClose(evt) {
      showScreen('<span style="color: red;"><a href="javascript:connect();"> RECONNECT </a></span>');
      // Auto-reconnect after a delay
      setTimeout(connect, 3000);
  };

  const clearElements = (Arr)=>Arr.map((unit)=>$(unit).val(""))

  const authenticated = (ed) => {
    console.log(ed)
    senderFns(sendMsg, "My Contacts:")
  }
  const fcmTokenAdd = (ed) => {
    console.log(ed)
    //alert("FCM Token Added!")
  }
  const messageSent = () => {
    clearElements(["#sendmessage textarea", "#sendmessage2 textarea"])
    //navigator.notification.alert("Message Sent!", ()=>null, "nice", "movin on")
  }

// Enhanced contact handler with test data fallback
const contactsGetComplete = (eventData) => {
  console.log("Contacts response received:", eventData.substring(0, 100));

  // Parse the contacts data
  const contactsData = eventData.replace("Contacts Get Complete!  ", "");

  // Handle empty or invalid data by using test contacts
  if (!contactsData || contactsData === "error" ||
      contactsData.trim() === "" || contactsData.includes("+?+{}")) {

    console.log("Using test contact data");

    // Create test contacts
    Contacts = [
      ["contact1@example.com", {
        task: {
          data: {
            name: "John Doe",
            avatar: "avatar_placeholder.png",
            email: "contact1@example.com"
          }
        }
      }],
      ["contact2@example.com", {
        task: {
          data: {
            name: "Jane Smith",
            avatar: "avatar_placeholder.png",
            email: "contact2@example.com"
          }
        }
      }],
      ["contact3@example.com", {
        task: {
          data: {
            name: "Alex Johnson",
            avatar: "avatar_placeholder.png",
            email: "contact3@example.com"
          }
        }
      }]
    ];
  } else {
    // Process real contact data
    try {
      Contacts = contactsData
        .split("||")
        .filter(part => part && part.trim() !== "" && !part.includes("+?+{}"))
        .map(part => {
          try {
            // Split email and task parts
            const splitIndex = part.indexOf("+?+");
            if (splitIndex === -1) {
              console.warn("Invalid contact format:", part.substring(0, 50));
              return null;
            }

            const email = part.substring(0, splitIndex);
            const taskStr = part.substring(splitIndex + 3);

            if (!email || email.trim() === "" || !taskStr || taskStr === "{}") {
              console.warn("Empty email or task data");
              return null;
            }

            // Parse JSON
            let parsedTask = JSON.parse(taskStr.replace(/'/g, "&apos;"));

            return [email, parsedTask];
          } catch (err) {
            console.warn("Error processing contact:", err);
            return null;
          }
        })
        .filter(contact => contact !== null);
    } catch (error) {
      console.error("Error parsing contacts:", error);

      // Fallback to test data
      Contacts = [
        ["contact1@example.com", {
          task: {
            data: {
              name: "John Doe (Fallback)",
              avatar: "avatar_placeholder.png",
              email: "contact1@example.com"
            }
          }
        }]
      ];
    }
  }

  console.log("Contact count:", Contacts.length);

  // Clear existing contacts
  $("#output").empty();

  // Populate recipient select boxes
  $("#msg_recipient").empty();
  $("#msg_recipient2").empty();

  // Add contacts to select dropdowns
  Contacts.forEach(unit => {
    $("#msg_recipient").append(`<option value="${unit[0]}">${unit[0]}</option>`);
    $("#msg_recipient2").append(`<option value="${unit[0]}">${unit[0]}</option>`);
  });

  // Display contacts
  Contacts.forEach(unit => {
    const contactData = unit[1].task.data;
    showVContacts(
      (contactData.avatar || "avatar_placeholder.png") + '::' +
      (contactData.name || unit[0]) + '::' +
      unit[0],
      "#output"
    );
  });
};

// Improved function to parse message data with better error handling
const cleanAndMapMessageToEmailTask = (messageData) => {
  if (!messageData) return [];

  console.log("Parsing message data");

  try {
    return messageData
      .split("||")
      .filter(part => part && part.trim() !== "")
      .map(part => {
        try {
          // Split email and task parts
          const splitIndex = part.indexOf("+?+");
          if (splitIndex === -1) {
            console.warn("Invalid message format (no +?+ separator):", part.substring(0, 50));
            return ["unknown", { task: { data: { message: "Invalid format" } } }];
          }

          const email = part.substring(0, splitIndex);
          const taskStr = part.substring(splitIndex + 3);

          // Clean the task string
          const cleanedTask = taskStr.replace(/'/g, "&apos;");

          // Parse the JSON
          let parsedTask;
          try {
            parsedTask = JSON.parse(cleanedTask);
          } catch (parseError) {
            console.warn("Error parsing JSON:", parseError.message, cleanedTask.substring(0, 50));
            return [email, { task: { data: { message: "Error parsing message" } } }];
          }

          return [email, parsedTask];
        } catch (err) {
          console.warn("Error processing message part:", err.message);
          return ["unknown", { task: { data: { message: "Processing error" } } }];
        }
      });
  } catch (error) {
    console.error("Fatal error in message parsing:", error);
    return [];
  }
};

// Function to handle "Message Get Complete" responses
// Updated message handler function
const messageGetComplete = (eventData) => {
  console.log("All Messages Response received");

  // Split the response to get the message data part
  // Format is "Message Get Complete! [data]"
  const messageData = eventData.replace("Message Get Complete! ", "");

  // Debug log a sample of the data
  console.log("Message data sample:", messageData.substring(0, 100));

  // Handle empty data case
  if (!messageData || messageData === "error" || messageData.trim() === "") {
    console.log("No message data available");
    $("#chat-messages-all").html("<p>No messages available</p>");
    return;
  }

  try {
    // Process the message data
    const parsedMessages = cleanAndMapMessageToEmailTask(messageData);
    console.log(`Parsed ${parsedMessages.length} messages`);

    // Initialize or update the messages array
    if (typeof e_ts === 'undefined') {
      e_ts = parsedMessages;
    } else {
      // Append new messages to existing ones
      e_ts = e_ts.concat(parsedMessages);
    }

    // Clear existing content
    $("#chat-messages-all").empty();

    // Handle no messages case
    if (e_ts.length === 0) {
      $("#chat-messages-all").html("<p>No messages available</p>");
      return;
    }

    // Sort messages by date (newest first)
    e_ts.sort((a, b) => {
      const dateA = new Date(a[1]?.task?.data?.when || 0);
      const dateB = new Date(b[1]?.task?.data?.when || 0);
      return dateB - dateA;
    });

    // Render messages
    let count = 0;
    e_ts.forEach(unit => {
      if (unit && unit.length >= 2 && unit[1] && unit[1].task && unit[1].task.data) {
        const messageData = unit[1].task.data;
        showVChatMessages(
          (messageData.avatar || "avatar_placeholder.png") + '::' +
          (messageData.message || "") + '::' +
          (messageData.respondTo || "") + '::' +
          (unit[0] || "") + '::' +
          (messageData.when || new Date().toISOString()) + '::' +
          count++,
          "#chat-messages-all"
        );
      }
    });
    
    // After processing messages, check for invitations
    checkFriendInvitations();
  } catch (error) {
    console.error("Error processing messages:", error);
    $("#chat-messages-all").html(`<p>Error loading messages: ${error.message}</p>`);
  } finally {
    // Hide loader if exists
    if ($("#loader").length) {
      $("#loader").hide();
    }
  }
};

  const messageFromComplete = (ed) =>  {  console.log("Message From Complete!")
    let [note, recipient, message ] = ed.split('::')
    if (message == "") {
      $("#chat-messages").html("No Messages Yet")
      //$.mobile.navigate("#page1");
      return
    }
    f_ts = cleanAndMapMessageToEmailTask(message)
    var count = 0
    //document.getElementById("sendmessage") ? document.getElementById("sendmessage").remove() : null
    $("#chat-messages").empty()
    document.getElementById("chat-messages").innerHTML = `<label>${new Date()}</label>`

     f_ts.map(unit => showVChatMessages(unit[1].task.data.avatar + '::'
            + unit[1].task.data.message + '::'
            + unit[1].task.data.respondTo + '::'
            + unit[0] + '::'
            + unit[1].task.data.when + '::'
            + count++, "#chat-messages"
      ))
  }
  const photoSaved = (ed) =>  {  console.log("photo saved!")
    navigator.notification.alert(ed, ()=>null, "sent", "movin on")
  }
  const mediaResponse = (ed) => {  console.log("media Response")
    console.log(ed.substring(0,255))
    let imageFilename_Data = ed.split('Media Response! ')[1]
    if (imageFilename_Data == "error") return null

    let [imageFilename, imageData] = imageFilename_Data.split("::")
    let i = new Image()
    i.setAttribute("width", "100%")
    i.src = imageData.match(/\x89PNG/) ? 'data:image/png;base64,' + imageData :
                                         'data:image/jpeg;base64,' + imageData
    //bring back req. filename and cache
    veej.addToCache([imageFilename, imageData])
    document.getElementById('imageAttachments').appendChild(i)
    if (typeof SpinnerDialog !== 'undefined') {
      SpinnerDialog.hide();
    }
  }

// Friend Management Functions

// Store pending invitations
let pendingInvitations = [];

// Add event handler for submitting add friend form
$(document).on("click", "#submitAddFriend", function(e) {
  e.preventDefault();
  
  const friendEmail = $("#friend_email").val();
  const friendName = $("#friend_name").val();
  const invitationMessage = $("#invitation_message").val();
  const addMethod = $("input[name='add_method']:checked").val();
  
  if (!friendEmail) {
    $("#add_friend_status").css("color", "red").text("Please enter your friend's email address");
    return;
  }
  
  if (addMethod === "direct") {
    // Direct add contact
    console.log("Adding contact directly:", friendEmail);
    senderFns(sendMsg, `Add Contact::${friendEmail}::${friendName}`);
  } else {
    // Send invitation
    console.log("Sending invitation to:", friendEmail);
    senderFns(sendMsg, `Invite Friend::${friendEmail}::${invitationMessage}`);
  }
  
  // Clear form and show status
  $("#add_friend_status").css("color", "green").text("Processing request...");
});

// Function to check for friend invitations
function checkFriendInvitations() {
  // We need to filter the messages to find invitations
  if (typeof e_ts !== 'undefined') {
    pendingInvitations = e_ts.filter(msg => {
      try {
        // Check if task exists and has the right type
        return msg[1] && 
               msg[1].task && 
               msg[1].task.type === 'vFriendInvite' && 
               msg[1].task.data && 
               msg[1].task.data.invitation === true;
      } catch (err) {
        return false;
      }
    });
    
    // Update invitations list if we're on that page
    if ($("body").pagecontainer("getActivePage").attr("id") === "invitations") {
      updateInvitationsList();
    }
    
    // Update badge
    if (pendingInvitations.length > 0) {
      $("#invitation-badge").text(pendingInvitations.length).show();
    } else {
      $("#invitation-badge").hide();
    }
  }
}

// Function to update the invitations list UI
function updateInvitationsList() {
  const $list = $("#invitations_list");
  $list.empty();
  
  if (pendingInvitations.length === 0) {
    $list.append(`<li>No pending invitations</li>`);
    return;
  }
  
  pendingInvitations.forEach((invitation, index) => {
    try {
      const data = invitation[1].task.data;
      const sender = data.respondTo;
      const message = data.message || "Would like to connect with you";
      const when = new Date(data.when).toLocaleString();
      const guid = data.code;
      
      $list.append(`
        <li>
          <div class="invitation-item">
            <h3>${sender}</h3>
            <p>${message}</p>
            <p class="invitation-time">Sent: ${when}</p>
            <div class="ui-grid-a">
              <div class="ui-block-a">
                <button class="accept-invitation ui-btn ui-corner-all ui-shadow" data-guid="${guid}">Accept</button>
              </div>
              <div class="ui-block-b">
                <button class="decline-invitation ui-btn ui-corner-all ui-shadow" data-guid="${guid}">Decline</button>
              </div>
            </div>
          </div>
        </li>
      `);
    } catch (err) {
      console.error("Error rendering invitation:", err);
    }
  });
  
  // Refresh the listview to apply styles
  if ($list.hasClass("ui-listview")) {
    $list.listview("refresh");
  }
}

// Handle accepting an invitation
$(document).on("click", ".accept-invitation", function() {
  const guid = $(this).data("guid");
  console.log("Accepting invitation:", guid);
  senderFns(sendMsg, `Accept Invitation::${guid}`);
});

// Handle declining an invitation
$(document).on("click", ".decline-invitation", function() {
  const guid = $(this).data("guid");
  console.log("Declining invitation:", guid);
  // For now just remove it from the UI since we don't have a decline handler
  $(this).closest("li").remove();
});

// Updated receiverFns with friend management responses
const receiverFns = R.cond([
  [(ed) => ed.startsWith("Authenticated!"), authenticated],
  [(ed) => ed.startsWith("FCM Token Add!"), fcmTokenAdd],
  [(ed) => ed.startsWith("Contacts Get Complete!"), contactsGetComplete],
  [(ed) => ed.match(/Message Get Complete!/), messageGetComplete],
  [(ed) => ed.match(/Message From Complete!/), messageFromComplete],
  [(ed) => ed.startsWith("Message Sent!"), messageSent],
  [(ed) => ed.match(/Photo Saved!/), photoSaved],
  [(ed) => ed.match(/Media Response! /), mediaResponse],
  // Add these new conditions
  [(ed) => ed.startsWith("Contact Added!"), (msg) => {
    console.log("Contact added:", msg);
    $("#add_friend_status").css("color", "green").text("Contact added successfully!");
    setTimeout(() => { $.mobile.navigate("#page1"); }, 1500);
  }],
  [(ed) => ed.startsWith("Contact Exists!"), (msg) => {
    console.log("Contact exists:", msg);
    $("#add_friend_status").css("color", "orange").text("This contact already exists in your list.");
  }],
  [(ed) => ed.startsWith("Invitation Sent!"), (msg) => {
    console.log("Invitation sent:", msg);
    $("#add_friend_status").css("color", "green").text("Invitation sent successfully!");
    setTimeout(() => { $.mobile.navigate("#page1"); }, 1500);
  }],
  [(ed) => ed.startsWith("Invitation Accepted!"), (msg) => {
    console.log("Invitation accepted:", msg);
    // Refresh contacts and navigate to contacts page
    senderFns(sendMsg, "My Contacts:");
    $.mobile.navigate("#page1");
  }],
  // Default case
  [(ed) => true, (msg) => console.log("Received unhandled message:", msg.substring(0, 100))]
]);

// Updated senderFns with friend management messages
const senderFns = R.cond([
  [(fn, msg)=>msg.startsWith("Send Message::"), (fn,msg)=>fn(msg)],
  [(fn, msg)=>msg.startsWith("My PhotoData::"), (fn,msg)=>fn(msg)],
  [(fn, msg)=>msg.startsWith("Media Message::"), (fn,msg)=>fn(msg)],
  // Add these new conditions
  [(fn, msg)=>msg.startsWith("Add Contact::"), (fn,msg)=>fn(msg)],
  [(fn, msg)=>msg.startsWith("Invite Friend::"), (fn,msg)=>fn(msg)],
  [(fn, msg)=>msg.startsWith("Accept Invitation::"), (fn,msg)=>fn(msg)],
  // Default case
  [(fn, msg)=>true, (fn,msg)=>fn(msg)]
]);

function onOpen(evt) {
  $("#output").empty()
  showScreen('<span style="color: green;">CONNECTED </span>');
  //   TODO: REQUEST LOGIN CREDENTIALS HERE
  let user = memoized_getLoginCredentials()
  //let password = localStorage.getItem("password")
  senderFns(sendMsg,"authenticate::" + user + "::" + "todo:psw"); // Password not used in deno version
  $("#connected").fadeIn('slow');
  $("#content").fadeIn('slow');
  
  // Check for any pending messages to send
  setTimeout(() => {
      if ($("body").pagecontainer("getActivePage").attr("id") === "page1") {
          senderFns(sendMsg, "All Messages::");
      }
  }, 1000);
}

// Add navigation to invitations page
$(document).on("pageshow", "#page1", function() {
  // Add button for checking invitations
  if (!$("#check-invitations-btn").length) {
    $("#page1_header").after(`
      <button id="check-invitations-btn" class="ui-btn ui-corner-all ui-shadow ui-btn-inline">
        Check Invitations <span id="invitation-badge" class="ui-btn-corner-all" style="display:none;">0</span>
      </button>
    `);
    
    // Add click handler
    $("#check-invitations-btn").on("click", function() {
      $.mobile.navigate("#invitations");
    });
  }
  
  // Only request messages if websocket is connected
  if (websocket && websocket.readyState === websocket.OPEN) {
    // Request all messages to check for invitations
    senderFns(sendMsg, "All Messages::");
  } else {
    console.log("WebSocket not ready yet, will try to fetch messages after connection");
    // Could set a flag to fetch messages once connected
  }
});

// When "All Messages" response comes in, check for invitations
$(document).on("pagecontainershow", function(event, ui) {
  const pageId = $("body").pagecontainer("getActivePage").attr("id");
  
  if (pageId === "invitations") {
    checkFriendInvitations();
    updateInvitationsList();
  }
});

// Add some CSS for invitation styling
$(document).ready(function() {
  $("head").append(`
    <style>
      .invitation-item {
        padding: 10px;
      }
      .invitation-time {
        font-size: 12px;
        color: #888;
        font-style: italic;
      }
      #invitation-badge {
        background-color: red;
        color: white;
        border-radius: 50%;
        padding: 2px 6px;
        font-size: 12px;
        margin-left: 5px;
      }
    </style>
  `);
});

  function onMessage(evt) {
    // Handle pong response from server
    if (evt.data === "pong") {
        return;
    }
    // Respond to server ping
    if (evt.data === "ping") {
        websocket.send("pong");
        return;
    }
    receiverFns(evt.data)
  }

  function onError(evt) {
      showScreen('<span style="color: red;">ERROR: ' + evt.data+ '</span>');
      // Try to reconnect on error after a delay
      setTimeout(connect, 5000);
  };
//--- END SOCKET UTILITIES AND SERVER RESPONSES ---//

//--- START RENDERERS --//
  function showScreen(txt) {
      $('#output').prepend('<li>' + txt + '</li>');
  };

  function showLoginPopUp() {
      //navigator.notification.alert("TODO: make login popup", ()=>null, "nice", "movin on")
      alert("TODO: make login popup")
      $("#output").prepend(`<div data-role="popup" id="myPopup" class="ui-content" style="min-width:250px;">
          <div>
            <h3>Login information</h3>
            <label for="usrnm" class="ui-hidden-accessible">Username:</label>
            <input type="text" name="user" id="usrnm" placeholder="Username">
            <label for="pswd" class="ui-hidden-accessible">Password:</label>
            <input type="password" name="passw" id="pswd" placeholder="Password">
            <label for="log">Keep me logged in</label>
            <input type="checkbox" name="login" id="log" value="1" data-mini="true">
            <input type="submit" id="set_login" value="Log in"></button>
          </div>
      </div>`)
      $("#myPopup").trigger("click")
      $("#set_login").on("click", ()=>{
        localStorage.setItem("user", ($("#usrnm").val()).toLowerCase())
        $("#page1_header").html("<h4>" + memoized_getLoginCredentials() + " Contacts</h4>")
        connect()
      })
  }

  // Rest of the code remains the same...

  // Initialize the heartbeat when the websocket opens
  const originalOnOpen = onOpen;
  onOpen = function(evt) {
    originalOnOpen(evt);
    startHeartbeat();
  };

  // Stop the heartbeat when the websocket closes
  const originalOnClose = onClose;
  onClose = function(evt) {
    originalOnClose(evt);
    stopHeartbeat();
  };

// Simplified showVContacts function with fixed image path handling
function showVContacts(txt, el) {
  const parts = txt.split("::");
  const avatar = parts[0] || "avatar_placeholder.png";
  const name = parts[1] || "Unknown";
  const email = parts[2] || "";

  // Check if we're using a relative path or a full path
  // Handle the avatar path more robustly
  let avatarPath;
  
  // If avatar is just a filename (like "avatar_placeholder.png")
  if (!avatar.includes('/')) {
    avatarPath = "/static/" + avatar;
  } 
  // If it's already a path (like "/images/user/...")
  else {
    avatarPath = avatar;
  }

  $(el).append(`
    <li>
      <a href="#chatview" data-name="${name}" data-avatar="${avatar}" data-email="${email}" class="mesg_link ui-link-inherit">
        <div class="friend clearfix">
          <img src="${avatarPath}" alt="${name}" class="friend-img" onerror="this.src='/static/avatar_placeholder.png'">
          <p>
            <strong>${name}</strong><br/>
            <span>${email}</span>
          </p>
        </div>
      </a>
    </li>
  `);
}

// Add this function to your app.js as a replacement for dateFns
function formatTimeAgo(date) {
  const now = new Date();
  const diffMs = now - date;
  
  // Convert to appropriate time units
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);
  
  if (diffSecs < 60) {
    return "just now";
  } else if (diffMins < 60) {
    return diffMins + " minute" + (diffMins > 1 ? "s" : "") + " ago";
  } else if (diffHours < 24) {
    return diffHours + " hour" + (diffHours > 1 ? "s" : "") + " ago";
  } else if (diffDays < 30) {
    return diffDays + " day" + (diffDays > 1 ? "s" : "") + " ago";
  } else if (diffMonths < 12) {
    return diffMonths + " month" + (diffMonths > 1 ? "s" : "") + " ago";
  } else {
    return diffYears + " year" + (diffYears > 1 ? "s" : "") + " ago";
  }
}

// Replace the showVChatMessages function with this updated version
function showVChatMessages(txt, el, append=true) {
  let options = {
        weekday: "long", year: "numeric", month: "short",
        day: "numeric", hour: "2-digit", minute: "2-digit"
    };
  let ta = txt.split("::")
  let message = ta[1]
  let sender = ta[2]
  let senderClass = sender == memoized_getLoginCredentials() ? " right " : ""
  let recipient = ta[3]
  // let base = "https://tbone.dyndns-ip.com/src/" // Original Erlang base
  // Assuming images are served from /images in Deno version
  let base = "/images/" // Updated for Deno structure
  let avatar = "avatar_placeholder.png"  //txt.split("::")[0]
  let when = (new Date(ta[4])).toLocaleTimeString("en-us", options)
  let counter = ta[5]
  let ava = sender !== memoized_getLoginCredentials() ? sender : recipient
  
  // Format time ago using our custom function instead of dateFns
  const timeAgo = formatTimeAgo(new Date(ta[4]));
  
  // if sender is me, then add right to class of message
  const mes = `
            <a href="#mesg_detail" data-count="${counter}" data-message="${message}" data-name="${name}" data-avatar="${avatar}" data-email="${recipient}" class="mesg_detail_link ui-link-inherit">
              <div class="message ${senderClass}">
                <img src="${base + sender + "/public_links/160/" + avatar}" onerror="this.src='/static/avatar_placeholder.png'" /> <div class="bubble">
                    ${message}
                      <div class="corner"></div>
                      <span>${timeAgo}</span>
                  </div>
              </div>
            </a>`
  append ? $(el).append(mes) : $(el).prepend(mes)
};

  function renderVChatMessage(payload, counter, el, append=true) {
    let options = {
          weekday: "long", year: "numeric", month: "short",
          day: "numeric", hour: "2-digit", minute: "2-digit"
      };

    let message = payload.task.data.message
    let sender = payload.task.data.respondTo
    let senderClass = sender == memoized_getLoginCredentials() ? " right " : ""
    let recipient = payload.task.data.email
    // let base = "http://192.168.0.125/src/" // Original Erlang base
    let base = "/images/" // Updated for Deno structure
    let avatar = "avatar_placeholder.png"  //payload.task.data.avatar
    let when = (new Date(payload.task.data.when)).toLocaleTimeString("en-us", options)
    // if sender is me, then add right to class of message
    const mes = `
              <a href="#mesg_detail" data-count="${counter}" data-message="${message}" data-name="${name}" data-avatar="${avatar}" data-email="${recipient}" class="mesg_detail_link ui-link-inherit">
                <div class="message ${senderClass}">
                  <img src="${base + sender + "/public_links/160/" + avatar}" onerror="this.src='/static/avatar_placeholder.png'" /> <div class="bubble">
                      ${message}
                        <div class="corner"></div>
                        </div>
                </div>
              </a>`
    append ? $(el).append(mes) : $(el).prepend(mes)
  };

  // Rest of your code...
  function appendChatMessage() {

  }

  function showVMessages(txt, el) {
    let options = {
          weekday: "long", year: "numeric", month: "short",
          day: "numeric", hour: "2-digit", minute: "2-digit"
      };
    let ta = txt.split("::")
    let message = ta[1]
    let sender = ta[2]
    let recipient = ta[3]
    // let base = "http://192.168.0.125/src/" // Original Erlang base
    let base = "/images/" // Updated for Deno structure
    let avatar = "avatar_placeholder.png"  //txt.split("::")[0]
    let when = (new Date(ta[4])).toLocaleTimeString("en-us", options)
    let counter = ta[5]
    //let ava = sender !== memoized_getLoginCredentials() ? sender : recipient
    //let nava = sender == memoized_getLoginCredentials() ? sender : recipient
    $(el).append(`
      <li data-icon="carat-r" class="ui-li ">
             <a href="#mesg_detail" data-count="${counter}" data-message="${message}" data-name="${name}" data-avatar="${avatar}" data-email="${recipient}" class="mesg_detail_link ui-btn ui-icon-carat-r ui-btn-icon-right ui-link-inherit">
              <img src="${base + sender + "/public_links/160/" + avatar}" width="40" onerror="this.src='/static/avatar_placeholder.png'" class=""> <p class="when"> ${when}</p>
              <img src="${base + recipient + "/public_links/160/" + avatar}" width="40" onerror="this.src='/static/avatar_placeholder.png'" class=""> <p class="ui-li-desc">${message}</p>
               </a>
          <span>&nbsp;</span>
        </li>
    `)
  };

  function showVMessage(txt, el) {
      let avatar = txt.split("::")[0]
      let message = txt.split("::")[1]
      let email = txt.split("::")[2]

      $(el).prepend(`
        <li data-corners="false" data-shadow="false" data-iconshadow="true" data-wrapperels="div" data-icon="arrow-r" data-iconpos="right" data-theme="c" class="ui-btn ui-btn-up-c ui-btn-icon-right ui-li-has-arrow ui-li ui-li-has-thumb">
        <div class="ui-btn-inner ui-li">
          <div class="ui-btn-text">
               <a href="#mesg_detail" data-message="${message}" data-name="${name}" data-avatar="${avatar}" data-email="${email}" class="mesg_detail_link  ui-link-inherit">
                <h1 class="ui-li-heading">${email}</h1>
                <img src="http://iviewsource.com/exercises/jqmlist/images/gummies_tn.jpg" alt="Gummy Bears" class="ui-li-thumb">
                <p class="ui-li-desc">${message}</p>
                 </a>
            </div>
            <span class="ui-icon ui-icon-arrow-r ui-icon-shadow">&nbsp;</span>
            </div>
          </li>
      `)
  };

  function clearScreen() {
      $('#output').html("");
  };
//--- END RENDERERS ---//

//--- START EVENT HELPERS ---//
  const nextCount = () =>
    1 + Math.max(...[].slice.call(document.querySelectorAll("[data-count]"))
                      .map(unit=>parseInt(unit.dataset.count,10)))

  const do_rewrite_msg_recipient_options = (Email) => {
      var Src = document.getElementById("selectRecipientWrapper")
      $("#selectRecipientWrapper").empty()
      let Phil = Contacts.reduce((acc, unit) => {
           if (unit[0] == Email) return acc.concat(`<option selected value="${unit[0]}">${unit[0]}</option>`)
           else                  return acc.concat(`<option value="${unit[0]}">${unit[0]}</option>`)
          }, "")
      let SelBoxText = `<select class="ui-btn" name="msg_recipient" id="msg_recipient"> ${Phil} </select>`
      Src.innerHTML = SelBoxText
       //$("#msg_recipient option[value='" + e.currentTarget.dataset.email + "']").prop("selected", true);
  }
  const update_recipient_options = function (e, data){
        currentMessageIndex = data ? data : parseInt(e.currentTarget.dataset.count)
        var pete

        currentMessageIndex = data ? data : parseInt(e.currentTarget.dataset.count)

        let pages= ["page1", "chatview", "mesg", "mesg_detail", "recipients", "send"]
        let currentPage = $( "body" ).pagecontainer( "getActivePage" ).attr("id")
        console.log("currentPage: ", $( "body" ).pagecontainer( "getActivePage" ).attr("id"))
        switch (currentPage) {
          // case "page1":
          //   //pete = e_ts[currentMessageIndex][1].task.data
          //   break;
          case "chatview":
            //Statements executed when the result of expression matches value2
            pete = f_ts[currentMessageIndex][1].task.data
            break;
          case "mesg":
            //Statements executed when the result of expression matches valueN
            pete = e_ts[currentMessageIndex][1].task.data
            break;
          // default:
          //   //Statements executed when none of the values match the value of the expression
          //   pete = e_ts[currentMessageIndex][1].task.data
          //   break;
        }
        //var pete = e_ts[currentMessageIndex][1].task.data
        let smartRecipient = pete.respondTo == memoized_getLoginCredentials() ? pete.email : pete.respondTo
        do_rewrite_msg_recipient_options(smartRecipient)
  }

  const payloadFiller = function(email, me, vGuid, msgBody){
    return {
            "task": {
              "type": 'vText',
              "sendTo": email,
              "meta": {
                "oneshot": false,
                "vcentral": true,
                "endpoint": "",
                "settings": [{"views": {"totalViews": 2}}, {"template": "default"}]
              },
              "data": {
                "from": me.username,
                "respondTo": me.email,
                "avatar": me.avatar,
                "code": vGuid,
                "when": new Date(),
                "email": email,
                "name": "Full Name",
                "username": "username",
                "message": msgBody.replace(/'/g, "&apos;"),
                "attachments": [],
              }
            }
          }
  }
  // var getStartingDate = () => typeof e_ts !== 'undefined' ? e_ts.map((u)=>new Date(u[1].task.data.when)).sort((a,b)=>b-a)[0].toJSON() : (new Date(0)).toJSON()
  var getStartingDateF = () => typeof e_ts !== 'undefined' ? f_ts.map((u)=>new Date(u[1].task.data.when)).sort((a,b)=>b-a)[0].toJSON() : (new Date(0)).toJSON()

//--- END EVENT HELPERS ---//

//--- START EVENTS---//
  // Get All Messages
// Get starting date with error handling
const getStartingDate = () => {
  try {
    if (typeof e_ts !== 'undefined' && e_ts.length > 0) {
      const dates = e_ts
        .filter(u => u && u[1] && u[1].task && u[1].task.data && u[1].task.data.when)
        .map(u => new Date(u[1].task.data.when));

      if (dates.length > 0) {
        return dates.sort((a, b) => b - a)[0].toJSON();
      }
    }
    return (new Date(0)).toJSON();
  } catch (error) {
    console.error("Error getting starting date:", error);
    return (new Date(0)).toJSON();
  }
};

  // Get Messages from an single contact
  $( document ).on( "click", 'a.mesg_link', function(e, data) {
    $("#name_header2").text(e.currentTarget.dataset.name)
    $("#sendcv").attr("data-email", e.currentTarget.dataset.email)
    console.log("Getting messages from " + e.currentTarget.dataset.email)
    senderFns(sendMsg, "My Messages::" + e.currentTarget.dataset.email);
    do_rewrite_msg_recipient_options(e.currentTarget.dataset.email)
  });
    // Send Message (3 ways, probably should abstract)
  $( document ).on( "click", '#sendcv', function(e, data) {
    let email   = e.currentTarget.dataset.email
    let msgBody = $("#sminput").val()
    let vGuid   = veej.guid()

    if (msgBody.length === 0 || msgBody == "Send message...") {
      navigator.notification.alert("message is empty", ()=>null, "nice", "movin on")
      return
    }
    console.log("sending message (sendcv) to: " + email)
    veej.me = {
      username: memoized_getLoginCredentials(),
      email: memoized_getLoginCredentials(),
      avatar: "avatar_placeholder.png"
    }
    let payload = payloadFiller(email, veej.me, vGuid, msgBody)
    renderVChatMessage(payload, nextCount(), "#chat-messages", false)
    senderFns(sendMsg, "Send Message::" + email + "::" + JSON.stringify(payload))
  });

  $( document ).on( "click", '#sendcv2', function(e, data) {
    let p = document.getElementById("msg_recipient2");
    var email = e.currentTarget.dataset.email || p.options.selectedIndex !== -1 ?  p.options[p.selectedIndex].value : null

    if (!email) {
      $("#msg_recipient2").empty()
      Contacts.map(unit => $("#msg_recipient2").append(`<option value="${unit[0]}">${unit[0]}</option>`))
      $.mobile.navigate("#recipients")
      return
    }
    $("#msg_recipient2").empty()
    console.log("email", email)
    let msgBody = $("#sminput2").val()
    let vGuid = veej.guid()

    if (msgBody.length === 0 || msgBody == "Send message...") {
      navigator.notification.alert("message is empty", ()=>null, "Empty", "movin back")
      return
    }
    let Json = {"email": email, "msgBody":msgBody}
    console.log("sending message (sendcv2) to: " + email)
    veej.me = {
     username: memoized_getLoginCredentials(),
     email: memoized_getLoginCredentials(),
     avatar: "avatar_placeholder.png"
    }
    let payload = payloadFiller(email, veej.me, vGuid, msgBody)
    renderVChatMessage(payload, nextCount(), "#chat-messages-all", false)
    senderFns(sendMsg, "Send Message::" + email + "::" + JSON.stringify(payload))
  });

  $( document ).on( "click", '#submitMsg', function(e, data) {
    var attachedPhoto = false, attachedPhotoData
    let p = document.getElementById("msg_recipient");
    let email  = p.options[p.selectedIndex].value;
    console.log("email", email)
    let msgBody = $("#msg_body_text").val()
    let vGuid = veej.guid()

    if ($('#smallImage').attr("src")) {
      attachedPhotoData = ($('#smallImage').attr("src")).split("base64,")[1]
      attachedPhoto = true
    }
    if (msgBody.length === 0) {
      navigator.notification.alert("message is empty", ()=>null, "Empty", "movin back")
      return
    }
    let Json = {"email": email, "msgBody":msgBody}
    console.log("sending message (submitMessage) to: " + email)
    veej.me = {
     username: memoized_getLoginCredentials(),
     email: memoized_getLoginCredentials(),
     avatar: "avatar_placeholder.png"
    }

    let payload = {
      "task": {
        "type": 'vText',
        "sendTo": email,
        "meta": {
          "oneshot": false,
          "vcentral": true,
          "endpoint": "",
          "settings": [{"views": {"totalViews": 2}, "template": "default"}]
        },
        "data": {
          "from": veej.me.username,
          "respondTo": veej.me.email,
          "avatar": veej.me.avatar,
          "code": vGuid,
          "when": new Date(),
          "email": email,
          "name": "Full Name",
          "username": "username",
          "message": msgBody.replace(/'/g, "&apos;"),
          "attachments": attachedPhoto ? [{"type": "image/jpeg", "location": vGuid + ".jpg"}] : [],
      }
     }}
    senderFns(sendMsg, "Send Message::" + email + "::" + JSON.stringify(payload))
    if (attachedPhoto) {
      senderFns(sendMsg, "My PhotoData::" + vGuid + "::" + attachedPhotoData)
     }
  });

  // Show Message w/Attachments todo: media
  $( document ).on( "click", 'a.mesg_detail_link', function(e, data) {
        renderMessage(e, data)
        update_recipient_options(e, data)
  });
//--- END EVENTS---//

//*** webapp and phoneapp diverge here! ***//
//--- START DEVICE STUFF ---//
  var pictureSource
  var destinationType

  function toDataURL(src, callback, outputFormat) {
    var img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = function() {
      var canvas = document.createElement('CANVAS');
      var ctx = canvas.getContext('2d');
      var dataURL;
      var wi = this.naturalWidth >= 768 ? 768 : this.naturalWidth
      canvas.height = (wi/this.naturalWidth) * this.naturalHeight;
      canvas.width = wi //this.naturalWidth;
      ctx.drawImage(this, 0, 0);
      dataURL = canvas.toDataURL(outputFormat);
      callback(dataURL);
    };
    img.src = src;
    if (img.complete || img.complete === undefined) {
      img.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
      img.src = src;
    }
  }
  const clipUriToUrl = (Intent) => {
     if (Intent.clipItems)
        Intent.clipItems.map((unit)=>{
          toDataURL(
            unit.uri,
            function(dataUrl) {
              console.log('RESULT:', dataUrl.substring(0, 32))
            $('#smallImage').attr("src", dataUrl);$('#smallImage').show()
          })
       })
  }
  function onDeviceReady() {
    // fires when app open
    if (window.plugins && window.plugins.intent) {
      window.plugins.intent.setNewIntentHandler(
        function (Intent) {
          console.log("huh ",Intent);
          clipUriToUrl(Intent)
      });
      // fires when app closed
      window.plugins.intent.getCordovaIntent(
        function (Intent) {
          console.log("huh2", Intent);
          clipUriToUrl(Intent)
        },
        function () {
          console.log('Error');
      });
    }

    if (typeof FCMPlugin !== 'undefined') {
      FCMPlugin.onTokenRefresh(function(token){
        if (msgBody.length === 0) {
          navigator.notification.alert("Token Refreshed", ()=>null, "nice", "movin on")
          return
        }
      })
      FCMPlugin.getToken(
        function(token){
          if(memoized_getLoginCredentials() && websocket.readyState == websocket.OPEN)
          senderFns(sendMsg, "FCM Message::" + token + "::" + memoized_getLoginCredentials())
          else {
            let Jim = setInterval(() => {
              console.log("checking if credentials and websocket...")
                if(memoized_getLoginCredentials() && websocket.readyState == websocket.OPEN) {
                  senderFns(sendMsg, "FCM Message::" + token + "::" + memoized_getLoginCredentials())
                  clearInterval(Jim)
               }}, 30000)
          }},
        function(err){
          navigator.notification.alert(err + " token error", ()=>null, "nice", "movin on")
      });
      FCMPlugin.onNotification(function(data){
        var jim = data.sender
        if(data.wasTapped){
          //Notification was received on device tray and tapped by the user.
          $.mobile.navigate( "#page1" );
          // $("#page1 [data-email='" + jim + "']").trigger("click")
          // $.mobile.navigate( "#chatview" );
          console.log("Getting messages from " + jim)
          $.mobile.navigate( "#chatview" );
          $("#name_header2").text(jim)
          $("#sendcv").attr("data-email", jim)
          senderFns(sendMsg, "My Messages::" + jim);
          do_rewrite_msg_recipient_options(jim)
        }
        else{
          //Notification was received in foreground. Maybe the user needs to be notified.
          navigator.notification.beep(1);
          let pages= ["page1", "chatview", "mesg", "mesg_detail", "recipients", "send"]
          let currentPage = $( "body" ).pagecontainer( "getActivePage" ).attr("id")
          console.log("currentPage: ", $( "body" ).pagecontainer( "getActivePage" ).attr("id"))
          switch (currentPage) {
            case "page1":
              $("#page1 [data-email='" + jim + "']").trigger("click")
              break;
            case "chatview":
              //Statements executed when the result of expression matches value2
              $("#page1 [data-email='" + jim + "']").trigger("click")
              break;
            case "mesg":
              //Statements executed when the result of expression matches valueN
              senderFns(sendMsg, "All Messages");
              break;
            default:
              //Statements executed when none of the values match the value of the expression
              $.mobile.navigate( "#" + currentPage );
              break;
          }

        //jim = data.sender
        //$("#page1 [data-email='" + jim + "']").trigger("click")
        //$.mobile.navigate( "#chatview" );
        }
      })
    }
    
    if (navigator.camera) {
      pictureSource=navigator.camera.PictureSourceType;
      destinationType=navigator.camera.DestinationType;
    }
  }
//--- END DEVICE STUFF ---//

//--- BEGIN Photo Callbacks ---//
  function onPhotoDataSuccess(imageData) {
    let smallImage = document.getElementById('smallImage');
    smallImage.style.display = 'block';
    smallImage.src = "data:image/jpeg;base64," + imageData;
  }

  function onPhotoURISuccess(imageURI) {
    let largeImage = document.getElementById('largeImage');
    largeImage.style.display = 'block';
    largeImage.src = imageURI;
  }

  function capturePhoto() {
    navigator.camera.getPicture(onPhotoDataSuccess, onFail, { quality: 50,
      destinationType: destinationType.DATA_URL });
  }

  function capturePhotoEdit() {
    // Take picture using device camera, allow edit, and retrieve image as base64-encoded string
    navigator.camera.getPicture(onPhotoDataSuccess, onFail, { quality: 20, allowEdit: true,
      destinationType: destinationType.DATA_URL });
  }

  function getPhoto(source) {
    // Retrieve image file location from specified source
    navigator.camera.getPicture(onPhotoDataSuccess, onFail, { quality: 50,
      destinationType: destinationType.DATA_URL,
      sourceType: source });
  }

  function onFail(message) {
    alert('Failed because: ' + message);
  }
//--- END Photo Callbacks ---//

// Set up a heartbeat to keep the connection alive
function startHeartbeat() {
  window.heartbeatInterval = setInterval(function() {
    if(websocket.readyState === websocket.OPEN) {
      websocket.send("ping");
    } else {
      connect();
    }
  }, 30000); // Send ping every 30 seconds
}

// Clear the heartbeat on disconnect
function stopHeartbeat() {
  if(window.heartbeatInterval) {
    clearInterval(window.heartbeatInterval);
  }
}

//--- BEGIN COMMENTED OUT ---//
  /*$(document).on("swipeleft", "#mesg_detail", e => {
    $('a.mesg_detail_link').trigger("click", [currentMessageIndex-1])
    })

  $(document).on("swiperight", "#mesg_detail", e => {
    $('a.mesg_detail_link').trigger("click", [currentMessageIndex+1])
    })

  $(document).on("keydown", "#mesg_detail", e => {
    if (e.keyCode == 37) {
           alert("left arrow, " + currentMessageIndex)
           $('a.mesg_detail_link').trigger("click", [currentMessageIndex-1])
    }
    else if (e.keyCode == 39) {
           //alert("right arrow")
           $('a.mesg_detail_link').trigger("click", [currentMessageIndex+1])
    }
  })*/
//--- END COMMENTED OUT ---//