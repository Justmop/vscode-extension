# Function to check if directory contains files directly (not in subdirectories)
has_direct_files() {
    local dir="$1"
    
    # Check for any regular file in the current directory (not recursive)
    for item in "$dir"/*; do
        if [ -f "$item" ]; then
            return 0  # Found a file
        fi
    done
    
    return 1  # No direct files found
}

# Main script
find $1/maestro -mindepth 1 -maxdepth 4 -type d -not -path "*/flow*" | while read -r dir; do
    # Only include directory if it has files directly in it
    if has_direct_files "$dir"; then
        echo "$dir" | sed 's|^.*maestro/||'
    fi
done