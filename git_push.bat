@echo off
git config user.email "bot@lucius.ai"
git config user.name "Lucius Bot"
git add .
git commit -m "fix(readme): Update YC batch to Spring 26"
git push -u origin master:python-rewrite
