#!/bin/zsh

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    echo "Warning: This script should be sourced, not executed directly."
    echo "Usage: source ./bin/run-dev.sh"
    echo "or: . ./bin/run-dev.sh"
fi


# Function to safely export environment variables from file
export_env_vars() {
    local env_file="$1"
    if [ -f "$env_file" ]; then
        echo "Loading environment from: $env_file"
        # Read file line by line and export variables
        while IFS= read -r line || [[ -n "$line" ]]; do
            # Skip empty lines and comments
            if [[ -n "$line" && ! "$line" =~ ^[[:space:]]*# ]]; then
                # Check if line contains =
                if [[ "$line" == *"="* ]]; then
                    # Split on first = only
                    key="${line%%=*}"
                    value="${line#*=}"
                    # Export the variable (zsh will handle the quoting)
                    export "$key=$value"
                fi
            fi
        done < "$env_file"
    else
        echo "Warning: $env_file not found."
    fi
}

# Load all environment files
export_env_vars "./env.d/development/common"
export_env_vars "./env.d/development/common.local"
export_env_vars "./env.d/development/postgresql"
export_env_vars "./env.d/development/postgresql.local"
