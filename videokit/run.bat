@echo off
node scripts/fix_script.mjs > node_log.txt 2>&1
echo Done >> node_log.txt
