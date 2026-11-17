# Schedulab — CPU Scheduling Simulator

A browser-based Operating Systems project built with HTML, CSS and vanilla JavaScript.

## Features
- Add, remove and clear processes with arrival time, burst time and priority.
- FCFS, SJF (non-preemptive), SRTF (preemptive), Priority (preemptive and non-preemptive), and Round Robin.
- Interactive Gantt chart with idle CPU periods.
- Completion, turnaround, waiting and response times.
- Average waiting, turnaround and response time plus throughput.
- Export process results to CSV.
- Sample workload included.

## Run in VS Code
1. Extract `CPU-Scheduling-Simulator.zip`.
2. Open the extracted `CPU-Scheduling-Simulator` folder in VS Code.
3. Open `index.html` in your browser, or install the **Live Server** extension.
4. If using Live Server, right-click `index.html` → **Open with Live Server**.

No Python, Node.js, database, or API key is required.

## Scheduling notes
- Lower priority number means higher priority.
- Round Robin uses the selected positive integer time quantum.
- Waiting time = turnaround time − burst time.
- Response time = first CPU start − arrival time.
- Throughput = completed processes / total elapsed simulation time.
