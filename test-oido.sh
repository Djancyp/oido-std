#!/bin/bash

# Test script to verify the oido command works correctly
echo "Testing oido command..."

# Show the command that would be executed
echo "Command that would be executed:"
echo "/home/djan/Documents/codding/agent-cli/oido-cli/oido --output-format stream-json --channel CI -p 'hi' -y -m openrouter/free"

# Test the command directly (without streaming)
echo ""
echo "=== Testing command directly ==="
/home/djan/Documents/codding/agent-cli/oido-cli/oido --output-format stream-json --channel CI -p 'hi' -y -m openrouter/free

echo ""
echo "=== Command execution completed ==="