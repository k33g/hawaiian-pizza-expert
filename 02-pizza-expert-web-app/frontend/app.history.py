import streamlit as st
import requests
import os
import json
from datetime import datetime

PAGE_TITLE = os.environ.get('PAGE_TITLE', 'Web Chat Bot demo')
PAGE_HEADER = os.environ.get('PAGE_HEADER', 'Made with Streamlit and LangChainJS')

PAGE_ICON = os.environ.get('PAGE_ICON', '🚀')

LLM_CHAT= os.environ.get('LLM_CHAT', '')
LLM_EMBEDDINGS= os.environ.get('LLM_EMBEDDINGS', '')

# Configuration of the Streamlit page
st.set_page_config(
    page_title=PAGE_TITLE, 
    page_icon=PAGE_ICON,
    layout="wide"  # Use wide layout to accommodate the side column
)

# Hide the Deploy button
st.markdown("""
    <style>
    .stDeployButton {
        visibility: hidden;
    }
    /* Ensure fonts render correctly for monospace content */
    code, pre {
        font-family: 'Courier New', Courier, monospace;
    }
    /* Style for the collapsible section */
    div[data-testid="stExpander"] {
        border: 1px solid #ddd;
        border-radius: 5px;
        margin-bottom: 10px;
    }
    </style>
    """, unsafe_allow_html=True)

# Initialisation of the session state
if "messages" not in st.session_state:
    st.session_state.messages = []

# Handle the reset of the input key
if "input_key" not in st.session_state:
    st.session_state.input_key = 0

# Initialize session ID in session state
if "session_id" not in st.session_state:
    st.session_state.session_id = "default"

# Initialize conversation history in session state
if "conversation_history" not in st.session_state:
    st.session_state.conversation_history = []

# Backend URL (the nodejs server)
BACKEND_SERVICE_URL = os.environ.get('BACKEND_SERVICE_URL', 'http://backend:5050')

def stream_response(message, session_id):
    """Stream the message response from the backend"""
    try:
        with requests.post(
            BACKEND_SERVICE_URL+"/chat",
            json={"message": message, "sessionId": session_id},
            headers={"Content-Type": "application/json"},
            stream=True
        ) as response:
            # Create a placeholder for the streaming response
            response_placeholder = st.empty()
            full_response = ""
            
            # Stream the response chunks
            for chunk in response.iter_content(chunk_size=1024):
                if chunk:
                    try:
                        # Decode using utf-8 with error handling
                        chunk_text = chunk.decode('utf-8', errors='replace')
                        full_response += chunk_text
                        
                        # For content that might contain tree-view or other special characters
                        if "```" in full_response:
                            # Process code blocks to ensure tree structures are formatted as raw
                            formatted_response = process_code_blocks(full_response)
                            response_placeholder.markdown(formatted_response)
                        else:
                            response_placeholder.markdown(full_response)
                    except UnicodeDecodeError:
                        # If there's still a decode error, replace problematic characters
                        st.warning("Encountered encoding issues with response")
                        chunk_text = chunk.decode('utf-8', errors='replace')
                        full_response += chunk_text
                        response_placeholder.markdown(full_response)
            
            # After response is complete, fetch updated conversation history
            fetch_conversation_history(session_id)
            return full_response
    except requests.exceptions.RequestException as e:
        error_msg = f"😡 Connection error: {str(e)}"
        st.error(error_msg)
        return error_msg

def fetch_conversation_history(session_id):
    """Fetch conversation history from the backend API"""
    try:
        response = requests.get(
            f"{BACKEND_SERVICE_URL}/conversation",
            params={"sessionId": session_id}
        )
        if response.status_code == 200:
            st.session_state.conversation_history = response.json()
        else:
            st.error(f"Failed to fetch conversation history: {response.status_code}")
    except requests.exceptions.RequestException as e:
        st.error(f"Error fetching conversation history: {str(e)}")

def process_code_blocks(text):
    """Process code blocks to properly display tree-view and other special characters"""
    # Split by code block markers
    parts = text.split("```")
    
    result = []
    for i, part in enumerate(parts):
        if i % 2 == 0:  # This is regular text
            result.append(part)
        else:  # This is code
            # Get the language identifier if present
            lines = part.strip().split('\n', 1)
            lang = lines[0].strip() if len(lines) > 1 else ""
            code_content = lines[1] if len(lines) > 1 else lines[0]
            
            # Check if it's a tree structure (simple heuristic)
            if any(char in code_content for char in ['│', '├', '└', '─', '┬', '┤']):
                # For tree structures, use raw formatting
                if lang != "raw":
                    result.append(f"```raw\n{code_content}\n```")
                else:
                    result.append(f"```{lang}\n{code_content}\n```")
            else:
                # Regular code, keep the original format
                result.append(f"```{part}```")
    
    return "".join(result)

def clear_conversation_history(session_id):
    """Clear the conversation history on the server"""
    try:
        response = requests.post(
            f"{BACKEND_SERVICE_URL}/clear-history",
            json={"sessionId": session_id},
            headers={"Content-Type": "application/json"}
        )
        if response.status_code == 200:
            st.session_state.messages = []  # Clear local messages too
            st.session_state.conversation_history = []  # Clear conversation history
            st.success("✨ Conversation history cleared!")
        else:
            st.error("Failed to clear conversation history")
    except requests.exceptions.RequestException as e:
        st.error(f"Error clearing history: {str(e)}")

def increment_input_key():
    """Increment the input key to reset the input field"""
    st.session_state.input_key += 1

# Create a two-column layout
main_col, history_col = st.columns([3, 1])

with main_col:
    # Page title
    st.title(PAGE_TITLE)
    st.header(PAGE_HEADER)

    # Session ID input
    session_id = st.text_input(
        "🔑 Session ID:",
        value=st.session_state.session_id,
        help="Enter a unique session ID to maintain conversation context"
    )
    st.session_state.session_id = session_id
    
    # Fetch conversation history when session ID changes
    if st.session_state.session_id != session_id:
        fetch_conversation_history(session_id)

    # Form to send a message
    with st.form(key=f"message_form_{st.session_state.input_key}"):
        message = st.text_area(f"📝 Your message: [📕 {LLM_CHAT} 🌐 {LLM_EMBEDDINGS}]", key=f"input_{st.session_state.input_key}", height=150)
        col1, col2, col3 = st.columns([1, 1, 3])
        with col1:
            submit_button = st.form_submit_button(label="Send...")
        with col2:
            cancel_button = st.form_submit_button(label="Cancel", type="secondary")
        with col3:
            clear_button = st.form_submit_button("Clear History 🗑️")

    # Handle the clear history button
    if clear_button:
        clear_conversation_history(st.session_state.session_id)
        st.rerun()

    # Handle the message submission
    if submit_button and message and len(message.strip()) > 0:
        # Add the message to the history
        st.session_state.messages.append({
            "role": "user",
            "content": message,
            "time": datetime.now(),
            "session_id": st.session_state.session_id
        })
        
        # Stream the response from the backend
        response = stream_response(message, st.session_state.session_id)
        
        # Add the response to the history
        st.session_state.messages.append({
            "role": "assistant",
            "content": response,
            "time": datetime.now(),
            "session_id": st.session_state.session_id
        })
        
        # Reset the input field
        increment_input_key()
        
        # Fetch updated conversation history
        fetch_conversation_history(st.session_state.session_id)
        
        st.rerun()

    # Handle the message submission and cancellation
    if cancel_button:
        try:
            response = requests.delete(f"{BACKEND_SERVICE_URL}/cancel")
            if response.status_code == 200:
                st.success("Request cancelled successfully")
            else:
                st.error("Failed to cancel request")
        except requests.exceptions.RequestException as e:
            st.error(f"Error cancelling request: {str(e)}")

    # Display the messages history
    st.write("### Messages history")
    for msg in reversed(st.session_state.messages):
        with st.container():
            if msg["role"] == "user":
                st.info(f"🤓 You ({msg['time'].strftime('%H:%M')}) - Session: {msg['session_id']}")
                st.write(msg["content"])
            else:
                st.success(f"🤖 Assistant ({msg['time'].strftime('%H:%M')}) - Session: {msg['session_id']}")
                # Process the message content to handle special formatting
                if "```" in msg["content"]:
                    formatted_content = process_code_blocks(msg["content"])
                    st.markdown(formatted_content)
                else:
                    st.markdown(msg["content"])

# Right column with the collapsible conversation history
with history_col:
    st.write("### Conversation JSON")
    
    # Fetch conversation history when loading the page
    if len(st.session_state.conversation_history) == 0:
        fetch_conversation_history(st.session_state.session_id)
    
    # Refresh button for conversation history
    if st.button("🔄 Refresh Conversation"):
        fetch_conversation_history(st.session_state.session_id)
    
    # Display the conversation history in a collapsible container
    with st.expander("View Conversation JSON", expanded=True):
        if st.session_state.conversation_history:
            st.json(st.session_state.conversation_history)
        else:
            st.info("No conversation history available")