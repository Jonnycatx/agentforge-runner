use keyring::Entry;

const SERVICE_PREFIX: &str = "agentforge";

/// Store a credential in the system keychain
pub fn store_credential(service: &str, key: &str, value: &str) -> Result<(), String> {
    let full_service = format!("{}-{}", SERVICE_PREFIX, service);
    
    let entry = Entry::new(&full_service, key)
        .map_err(|e| format!("Failed to create keyring entry: {}", e))?;
    
    entry.set_password(value)
        .map_err(|e| format!("Failed to store credential: {}", e))?;
    
    Ok(())
}

/// Retrieve a credential from the system keychain
pub fn get_credential(service: &str, key: &str) -> Result<Option<String>, String> {
    let full_service = format!("{}-{}", SERVICE_PREFIX, service);
    
    let entry = Entry::new(&full_service, key)
        .map_err(|e| format!("Failed to create keyring entry: {}", e))?;
    
    match entry.get_password() {
        Ok(password) => Ok(Some(password)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(format!("Failed to retrieve credential: {}", e)),
    }
}

/// Delete a credential from the system keychain
pub fn delete_credential(service: &str, key: &str) -> Result<(), String> {
    let full_service = format!("{}-{}", SERVICE_PREFIX, service);
    
    let entry = Entry::new(&full_service, key)
        .map_err(|e| format!("Failed to create keyring entry: {}", e))?;
    
    match entry.delete_credential() {
        Ok(_) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()), // Already deleted
        Err(e) => Err(format!("Failed to delete credential: {}", e)),
    }
}

/// List of credential types for tools
#[derive(Debug, Clone)]
pub struct CredentialType {
    pub id: String,
    pub name: String,
    pub required_fields: Vec<String>,
}

/// Get credential requirements for a tool
pub fn get_tool_credential_type(tool_id: &str) -> Option<CredentialType> {
    match tool_id {
        "openai" => Some(CredentialType {
            id: "openai".to_string(),
            name: "OpenAI".to_string(),
            required_fields: vec!["api_key".to_string()],
        }),
        "anthropic" => Some(CredentialType {
            id: "anthropic".to_string(),
            name: "Anthropic".to_string(),
            required_fields: vec!["api_key".to_string()],
        }),
        "google" => Some(CredentialType {
            id: "google".to_string(),
            name: "Google AI".to_string(),
            required_fields: vec!["api_key".to_string()],
        }),
        "groq" => Some(CredentialType {
            id: "groq".to_string(),
            name: "Groq".to_string(),
            required_fields: vec!["api_key".to_string()],
        }),
        "xai" => Some(CredentialType {
            id: "xai".to_string(),
            name: "xAI".to_string(),
            required_fields: vec!["api_key".to_string()],
        }),
        "gmail" => Some(CredentialType {
            id: "gmail".to_string(),
            name: "Gmail".to_string(),
            required_fields: vec!["client_id".to_string(), "client_secret".to_string(), "refresh_token".to_string()],
        }),
        "tavily" => Some(CredentialType {
            id: "tavily".to_string(),
            name: "Tavily Search".to_string(),
            required_fields: vec!["api_key".to_string()],
        }),
        "serpapi" => Some(CredentialType {
            id: "serpapi".to_string(),
            name: "SerpAPI".to_string(),
            required_fields: vec!["api_key".to_string()],
        }),
        "alpha_vantage" => Some(CredentialType {
            id: "alpha_vantage".to_string(),
            name: "Alpha Vantage".to_string(),
            required_fields: vec!["api_key".to_string()],
        }),
        "newsapi" => Some(CredentialType {
            id: "newsapi".to_string(),
            name: "NewsAPI".to_string(),
            required_fields: vec!["api_key".to_string()],
        }),
        _ => None,
    }
}
