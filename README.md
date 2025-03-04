# FedEx Equipment Check-Out System (FECS)

A client‑side web application for managing equipment check‑out and check‑in for employees. The app includes features for employee and equipment management, record keeping, filtering, and CSV import/export—all stored in the browser's local storage.

## Overview

This web app is designed to be a lightweight, static check‑out system that runs entirely in the browser. It helps you:
- **Check-Out/In Equipment:** Record when employees check out or return equipment.
- **Employee Management:** Add or remove employees via the admin panel.
- **Equipment Management:** Add or remove equipment records via the admin panel.
- **Record Keeping:** Maintain a local log of all check‑out and check‑in transactions.
- **CSV Import/Export:** Easily export and import employee and equipment data in CSV format.
- **Notifications:** Displays overdue equipment based on current records.

## Features

- **Responsive Design:** Uses HTML, CSS, and JavaScript for a user-friendly interface.
- **Local Storage:** All data is stored locally using the browser's localStorage.
- **Dynamic Forms:** Ability to add multiple equipment barcode fields on the check‑out form.
- **Admin Panel:** Manage employees and equipment with forms for adding/removing items.
- **Inventory Import/Export:** CSV support for importing and exporting employee and equipment data.
- **Record Filtering:** Filter check‑out/in records by employee, equipment, or date.
- **Notification Banner:** Alerts for overdue equipment based on check‑out status.

## Technologies Used

- **HTML5** for structure.
- **CSS3** for styling.
- **JavaScript** (Vanilla) for app functionality and data handling.
- **LocalStorage API** to persist data across sessions.

## How It Works

1. **Check-Out/In Flow:**  
   - Employees scan their badge and equipment barcodes.  
   - The form captures the current time and date along with the check‑out or check‑in action.  
   - A record is created and stored in localStorage.

2. **Admin Panel:**  
   - Manage employees by adding or removing them based on their badge IDs.
   - Manage equipment by adding or removing equipment items using serial numbers.
   - Import or export data via CSV files.

3. **Records and Notifications:**  
   - All transactions are shown in a records section where you can filter and export them.
   - The notification banner highlights any equipment that has been checked out and not yet returned.

## Setup and Installation

### Running Locally

1. Clone or download the repository.
2. Open `index.html` in your browser.
3. All functionality should work without any server setup since it uses localStorage.


## Contributing

Contributions, suggestions, or bug reports are welcome! Please open an issue or submit a pull request.

## License

This project is provided as-is for educational and demonstration purposes. You can choose to license it under an open‑source license if you modify or extend it.
