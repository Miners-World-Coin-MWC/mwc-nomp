#!/usr/bin/env bash
set -e

CONFIG_DIR="./config"
COINS_DIR="$CONFIG_DIR/coins"
TEMPLATE_DIR="./pool_configs/"

echo "⛏️ Miners World Coin - Pool Setup Wizard"
echo "======================================="
echo

mkdir -p "$COINS_DIR"

if [ ! -d "$TEMPLATE_DIR" ]; then
  echo "❌ No coin templates found in $TEMPLATE_DIR"
  exit 1
fi

echo "Available coin templates:"
echo

select coin in $(ls "$TEMPLATE_DIR") "DONE"; do
  if [ "$coin" == "DONE" ]; then
    break
  fi

  if [ -n "$coin" ]; then
    echo "✅ Enabling $coin..."
    cp "$TEMPLATE_DIR/$coin" "$COINS_DIR/"
  fi
done

echo
echo "🎉 Coin setup complete!"
echo "Enabled coins:"
ls -1 "$COINS_DIR"
echo
echo "Next steps:"
echo "  docker-compose up -d"
