
from services.task_parser import parse_dictation_to_items

tests = [
    "Remind me to review budget at 2:00 PM.",
    "Dictate my day: Remind me to review budget at 2pm and email Sarah the launch notes.",
    "Mark lunch by 3:00 PM at tomorrow's date on calendar."
]

for text in tests:
    print("\nINPUT:", text)
    print("OUTPUT:", parse_dictation_to_items(text))
