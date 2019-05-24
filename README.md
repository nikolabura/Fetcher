# Fetcher
Discord bot used to report course information and dining hall menus from UMBC websites.

# Command list

## !class
Returns title, credits, and course description for a UMBC course.
Examples: `!class CMSC202` `!class GES110`

## !dhall
Looks up what is on the dining hall menu for a specific date and meal period. Menus are looked up using the Dine On Campus API.
This command has the syntax `!dhall [MEAL PERIOD] [DATE (optional)]`

If not provided, the date will default to today, or tomorrow if the time is after 9PM.

Examples: 
```
!dhall lunch
!dhall lunch tomorrow
!dhall lunch friday
!dhall lunch 2019-3-15
```

## !ping

Returns "Pong!" if the bot is active.

## !help

Returns command listing.
