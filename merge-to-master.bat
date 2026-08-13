@echo off
REM Script to merge current branch to target branch and push to remote
REM Usage: merge-to-master.bat [target-branch]
REM Example: merge-to-master.bat develop

REM Get target branch from argument, default to master
if "%~1"=="" (
    set TARGET_BRANCH=main
) else (
    set TARGET_BRANCH=%~1
)

echo ============================================================
echo Merge Current Branch to %TARGET_BRANCH% Script
echo ============================================================
echo.

REM Get current branch name
for /f "tokens=*" %%i in ('git rev-parse --abbrev-ref HEAD') do set CURRENT_BRANCH=%%i

echo Current branch: %CURRENT_BRANCH%
echo Target branch: %TARGET_BRANCH%
echo.

REM Check if already on target branch
if "%CURRENT_BRANCH%"=="%TARGET_BRANCH%" (
    echo ERROR: You are already on %TARGET_BRANCH% branch!
    echo Please switch to a feature branch first.
    pause
    exit /b 1
)

REM Check for uncommitted changes
git diff-index --quiet HEAD --
if errorlevel 1 (
    echo You have uncommitted changes.
    echo.
    set /p COMMIT_MSG="Enter commit message (or press Enter to skip commit): "
    
    if not "!COMMIT_MSG!"=="" (
        echo Committing changes...
        git add -A
        git commit -m "!COMMIT_MSG!"
        if errorlevel 1 (
            echo ERROR: Failed to commit changes
            pause
            exit /b 1
        )
    ) else (
        echo Skipping commit. Continuing with existing commits...
    )
)

echo.
echo Step 1: Pushing current branch to remote...
git push origin %CURRENT_BRANCH%
if errorlevel 1 (
    echo ERROR: Failed to push current branch
    pause
    exit /b 1
)

echo.
echo Step 2: Switching to %TARGET_BRANCH% branch...
git checkout %TARGET_BRANCH%
if errorlevel 1 (
    echo ERROR: Failed to switch to %TARGET_BRANCH%
    pause
    exit /b 1
)

echo.
echo Step 3: Pulling latest %TARGET_BRANCH% from remote...
git pull origin %TARGET_BRANCH%
if errorlevel 1 (
    echo ERROR: Failed to pull latest %TARGET_BRANCH%
    pause
    exit /b 1
)

echo.
echo Step 4: Merging %CURRENT_BRANCH% into %TARGET_BRANCH% (taking source branch on conflicts)...
git merge %CURRENT_BRANCH% --no-ff -X theirs -m "Merge branch '%CURRENT_BRANCH%' into %TARGET_BRANCH%"
if errorlevel 1 (
    echo.
    echo ERROR: Merge failed!
    echo Please check the error above and resolve manually.
    pause
    exit /b 1
)

echo.
echo Step 5: Pushing %TARGET_BRANCH% to remote...
git push origin %TARGET_BRANCH%
if errorlevel 1 (
    echo ERROR: Failed to push to remote %TARGET_BRANCH%
    pause
    exit /b 1
)

echo.
echo ============================================================
echo SUCCESS! Branch %CURRENT_BRANCH% has been merged to %TARGET_BRANCH%
echo ============================================================
echo.
set /p SWITCH_BACK="Switch back to %CURRENT_BRANCH%? (y/n): "

if /i "%SWITCH_BACK%"=="y" (
    git checkout %CURRENT_BRANCH%
    echo Switched back to %CURRENT_BRANCH%
)

echo.
echo Done!
pause
