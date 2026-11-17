const $ = id => document.getElementById(id);
let processes = [];
let lastResult = null;
const descriptions = {
  fcfs: ["FCFS", "Processes execute in arrival order. Simple and fair by arrival, but a long process can make others wait."],
  sjf: ["SJF · Non-preemptive", "The available process with the shortest burst time runs to completion. It can reduce average waiting time."],
  srtf: ["SRTF · Preemptive", "The process with the shortest remaining time runs. A newly arrived short job can interrupt the current process."],
  priority: ["Priority · Non-preemptive", "The ready process with the highest priority (lowest number) runs to completion."],
  priorityP: ["Priority · Preemptive", "A higher-priority process can interrupt the running process. Lower priority numbers mean higher priority."],
  rr: ["Round Robin", "Each ready process gets a fixed time slice. When its quantum expires, it moves to the back of the ready queue."]
};
const palette = ["#7165e9","#3ebd9a","#eea65b","#5c8fdc"];
function renderProcesses() {
  $("processRows").innerHTML = processes.map((p,i)=>`<tr><td><span class="pid-pill">${escapeHtml(p.id)}</span></td><td>${p.arrival}</td><td>${p.burst}</td><td>${p.priority}</td><td><button class="delete-btn" data-index="${i}" title="Remove process">×</button></td></tr>`).join("");
  $("processCount").textContent = `${processes.length} process${processes.length===1?"":"es"} added`;
  document.querySelectorAll(".delete-btn").forEach(btn=>btn.addEventListener("click",()=>{processes.splice(Number(btn.dataset.index),1);renderProcesses();}));
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function addProcess() {
  const id=$("pid").value.trim(), arrival=Number($("arrival").value), burst=Number($("burst").value), priority=Number($("priority").value);
  if(!id || processes.some(p=>p.id.toLowerCase()===id.toLowerCase())) return alert("Enter a unique process ID.");
  if(!Number.isInteger(arrival)||arrival<0||!Number.isInteger(burst)||burst<1||!Number.isInteger(priority)||priority<1) return alert("Arrival must be 0 or more. Burst and priority must be positive whole numbers.");
  processes.push({id,arrival,burst,priority});
  renderProcesses(); $("pid").value=`P${processes.length+1}`; $("arrival").value=0; $("burst").value=5; $("priority").value=2; $("pid").focus();
}
// RANDOM WORKLOAD GENERATOR

function generateRandomWorkload() {
    const count = Number(document.getElementById("randomCount").value);

    processes = [];

    for (let i = 1; i <= count; i++) {
        processes.push({
            id: `P${i}`,
            arrival: Math.floor(Math.random() * 11),
            burst: Math.floor(Math.random() * 12) + 1,
            priority: Math.floor(Math.random() * 5) + 1
        });
    }

    processes.sort((a, b) => a.arrival - b.arrival);

    renderProcesses();

    document.getElementById("pid").value = `P${count + 1}`;

    // Clear old simulation results
    lastResult = null;
    clearInterval(simulationTimer);
    simulationTimer = null;

    document.getElementById("resultContent").classList.add("hidden");
    document.getElementById("emptyState").classList.remove("hidden");
    document.getElementById("exportBtn").disabled = true;

    alert(`${count} random processes generated successfully!`);
}
function loadSample(){processes=[{id:"P1",arrival:0,burst:7,priority:2},{id:"P2",arrival:2,burst:4,priority:1},{id:"P3",arrival:4,burst:1,priority:3},{id:"P4",arrival:5,burst:4,priority:2}];renderProcesses();$("pid").value="P5";}
function cloneJobs(){return processes.map((p,index)=>({...p,remaining:p.burst,firstStart:null,completion:null,index}));}
function addSegment(segments,id,start,end){if(end<=start)return;const last=segments[segments.length-1];if(last&&last.id===id&&last.end===start)last.end=end;else segments.push({id,start,end});}
function simulate(){
 if(!processes.length)return alert("Please add at least one process first.");
 const algo=$("algorithm").value, quantum=Number($("quantum").value);
 if(algo==="rr"&&(!Number.isInteger(quantum)||quantum<1))return alert("Time quantum must be a positive whole number.");
 const jobs=cloneJobs(), segments=[];let time=0,done=0;
 if(algo==="fcfs"||algo==="sjf"||algo==="priority"){
   while(done<jobs.length){
     const ready=jobs.filter(j=>j.completion===null&&j.arrival<=time);
     if(!ready.length){const next=Math.min(...jobs.filter(j=>j.completion===null).map(j=>j.arrival));addSegment(segments,"IDLE",time,next);time=next;continue;}
     ready.sort((a,b)=>algo==="fcfs"?(a.arrival-b.arrival||a.index-b.index):algo==="sjf"?(a.burst-b.burst||a.arrival-b.arrival||a.index-b.index):(a.priority-b.priority||a.arrival-b.arrival||a.index-b.index));
     const j=ready[0];j.firstStart=time;addSegment(segments,j.id,time,time+j.burst);time+=j.burst;j.remaining=0;j.completion=time;done++;
   }
 } else if(algo==="rr"){
   let queue=[],added=new Set();
   while(done<jobs.length){
     jobs.filter(j=>j.arrival<=time&&!added.has(j.index)).sort((a,b)=>a.arrival-b.arrival||a.index-b.index).forEach(j=>{queue.push(j);added.add(j.index);});
     if(!queue.length){const next=Math.min(...jobs.filter(j=>j.remaining>0).map(j=>j.arrival));addSegment(segments,"IDLE",time,next);time=next;continue;}
     const j=queue.shift();if(j.firstStart===null)j.firstStart=time;
     const run=Math.min(quantum,j.remaining);addSegment(segments,j.id,time,time+run);time+=run;j.remaining-=run;
     jobs.filter(x=>x.arrival<=time&&!added.has(x.index)).sort((a,b)=>a.arrival-b.arrival||a.index-b.index).forEach(x=>{queue.push(x);added.add(x.index);});
     if(j.remaining>0)queue.push(j);else{j.completion=time;done++;}
   }
 } else {
   while(done<jobs.length){
     const ready=jobs.filter(j=>j.remaining>0&&j.arrival<=time);
     if(!ready.length){const next=Math.min(...jobs.filter(j=>j.remaining>0).map(j=>j.arrival));addSegment(segments,"IDLE",time,next);time=next;continue;}
     ready.sort((a,b)=>algo==="srtf"?(a.remaining-b.remaining||a.arrival-b.arrival||a.index-b.index):(a.priority-b.priority||a.arrival-b.arrival||a.index-b.index));
     const j=ready[0];if(j.firstStart===null)j.firstStart=time;
     addSegment(segments,j.id,time,time+1);j.remaining--;time++;
     if(j.remaining===0){j.completion=time;done++;}
   }
 }
 const rows=jobs.sort((a,b)=>a.index-b.index).map(j=>({id:j.id,arrival:j.arrival,burst:j.burst,priority:j.priority,completion:j.completion,turnaround:j.completion-j.arrival,waiting:j.completion-j.arrival-j.burst,response:j.firstStart-j.arrival}));
 const avg=key=>rows.reduce((s,r)=>s+r[key],0)/rows.length;
 lastResult={algo,quantum,segments,rows,avgWaiting:avg("waiting"),avgTurnaround:avg("turnaround"),avgResponse:avg("response"),totalTime:time,throughput:rows.length/time};
 currentStep = 0;
clearInterval(simulationTimer);
simulationTimer = null;
renderResults();
renderStep();
// UPDATE LIVE PROCESS QUEUE

const currentSegment = segments[currentStep - 1];

const currentTime = currentSegment
    ? currentSegment.end
    : 0;

const running = currentSegment &&
    currentSegment.id !== "IDLE"
    ? currentSegment.id
    : "None";

const completed = lastResult.rows
    .filter(p => p.completion <= currentTime)
    .map(p => p.id);

const waiting = lastResult.rows
    .filter(p =>
        p.arrival <= currentTime &&
        p.completion > currentTime &&
        p.id !== running
    )
    .map(p => p.id);

document.getElementById("runningProcess").textContent = running;

document.getElementById("waitingProcesses").textContent =
    waiting.length ? waiting.join("  •  ") : "None";

document.getElementById("completedProcesses").textContent =
    completed.length ? completed.join("  •  ") : "None";
}
function renderResults(){
 $("emptyState").classList.add("hidden");$("resultContent").classList.remove("hidden");$("exportBtn").disabled=false;
 const r=lastResult, names={fcfs:"First Come First Served",sjf:"Shortest Job First",srtf:"Shortest Remaining Time First",priority:"Priority (Non-preemptive)",priorityP:"Priority (Preemptive)",rr:"Round Robin"};
 $("resultSummary").innerHTML=`<b>${names[r.algo]}</b> completed ${r.rows.length} processes in ${r.totalTime} time units${r.algo==="rr"?` · Time quantum: ${r.quantum}`:""}.`;
 const total=Math.max(r.totalTime,1);
 $("gantt").innerHTML=r.segments.map((s,i)=>`<div class="gantt-block ${s.id==="IDLE"?"idle":""}" style="--duration:${s.end-s.start};flex-grow:${s.end-s.start}" title="${s.id}: ${s.start} to ${s.end}">${escapeHtml(s.id)}<small>${s.end-s.start} unit${s.end-s.start===1?"":"s"}</small></div>`).join("");
 $("timeline").innerHTML=r.segments.map(s=>`<span>${s.start}</span>`).join("")+`<span>${r.totalTime}</span>`;
 $("metrics").innerHTML=[["AVG. WAITING TIME",r.avgWaiting.toFixed(2)],["AVG. TURNAROUND",r.avgTurnaround.toFixed(2)],["AVG. RESPONSE",r.avgResponse.toFixed(2)],["THROUGHPUT",r.throughput.toFixed(3)]].map(m=>`<div class="metric"><span>${m[0]}</span><b>${m[1]}</b></div>`).join("");
 $("resultRows").innerHTML=r.rows.map(x=>`<tr><td><span class="pid-pill">${escapeHtml(x.id)}</span></td><td>${x.arrival}</td><td>${x.burst}</td><td>${x.completion}</td><td>${x.turnaround}</td><td>${x.waiting}</td><td>${x.response}</td></tr>`).join("");
detectStarvation();
}
function exportCSV(){
 if(!lastResult)return;const headers=["Process","Arrival","Burst","Priority","Completion","Turnaround","Waiting","Response"];
 const lines=[headers.join(","),...lastResult.rows.map(r=>[r.id,r.arrival,r.burst,r.priority,r.completion,r.turnaround,r.waiting,r.response].join(","))];
 lines.push("",`Average waiting time,${lastResult.avgWaiting.toFixed(2)}`,`Average turnaround time,${lastResult.avgTurnaround.toFixed(2)}`,`Average response time,${lastResult.avgResponse.toFixed(2)}`);
 const blob=new Blob([lines.join("\n")],{type:"text/csv"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="cpu-scheduling-results.csv";a.click();URL.revokeObjectURL(url);
}
$("addBtn").addEventListener("click",addProcess);$("randomBtn").addEventListener("click", generateRandomWorkload);
$("sampleBtn").addEventListener("click",loadSample);$("clearBtn").addEventListener("click",()=>{processes=[];renderProcesses();$("resultContent").classList.add("hidden");$("emptyState").classList.remove("hidden");$("exportBtn").disabled=true;lastResult=null;});
$("runBtn").addEventListener("click",simulate);$("exportBtn").addEventListener("click",exportCSV);
$("algorithm").addEventListener("change",()=>{const key=$("algorithm").value; $("quantumWrap").classList.toggle("hidden",key!=="rr");$("algorithmInfo").innerHTML=`<b>${descriptions[key][0]}</b><p>${descriptions[key][1]}</p>`;});
loadSample();

// STEP-BY-STEP SIMULATION CONTROLS

let currentStep = 0;
let simulationTimer = null;

function renderStep() {
    if (!lastResult) return;

    const segments = lastResult.segments;
    const gantt = document.getElementById("gantt");

    gantt.innerHTML = segments.map((segment, index) => {
        const completed = index < currentStep;
        const active = index === currentStep;

        return `
            <div class="gantt-block ${segment.id === "IDLE" ? "idle" : ""}"
                 style="
                    --duration:${segment.end - segment.start};
                    flex-grow:${segment.end - segment.start};
                    opacity:${completed ? 1 : active ? 1 : 0.25};
                    outline:${active ? "3px solid #182238" : "none"};
                 ">
                ${segment.id}
                <small>${segment.start} - ${segment.end}</small>
            </div>
        `;
    }).join("");

    document.getElementById("stepCounter").textContent =
        `Step ${currentStep} / ${segments.length}`;
updateCpuMonitor();
updateContextMonitor();
}

document.getElementById("nextStep").addEventListener("click", () => {
    if (!lastResult) return;
    if (currentStep < lastResult.segments.length) {
        currentStep++;
        renderStep();
    }
});

document.getElementById("previousStep").addEventListener("click", () => {
    if (!lastResult) return;
    if (currentStep > 0) {
        currentStep--;
        renderStep();
    }
});

document.getElementById("playSimulation").addEventListener("click", () => {
    if (!lastResult || simulationTimer) return;

    simulationTimer = setInterval(() => {
        if (currentStep < lastResult.segments.length) {
            currentStep++;
            renderStep();
        } else {
            clearInterval(simulationTimer);
            simulationTimer = null;
        }
    }, 1000);
});

document.getElementById("pauseSimulation").addEventListener("click", () => {
    clearInterval(simulationTimer);
    simulationTimer = null;
});

// ALGORITHM COMPARISON MODE

// FEATURE 3 + 7: ALGORITHM COMPARISON AND GRAPHS

document.getElementById("compareBtn").addEventListener("click", () => {

    if (processes.length === 0) {
        alert("Please add processes before comparing algorithms.");
        return;
    }

    const algorithms = [
        "fcfs", "sjf", "srtf",
        "priority", "priorityP", "rr"
    ];

    const originalAlgorithm = document.getElementById("algorithm").value;
    const results = [];

    clearInterval(simulationTimer);
    simulationTimer = null;

    algorithms.forEach(algo => {
        document.getElementById("algorithm").value = algo;

        simulate();

        if (lastResult) {
            results.push({
                name: descriptions[algo][0],
                waiting: lastResult.avgWaiting,
                turnaround: lastResult.avgTurnaround,
                response: lastResult.avgResponse,
                utilization:
                    (lastResult.segments
                        .filter(s => s.id !== "IDLE")
                        .reduce((sum, s) => sum + s.end - s.start, 0)
                    / lastResult.totalTime) * 100
            });
        }
    });

    // Restore original algorithm
    document.getElementById("algorithm").value = originalAlgorithm;
    simulate();

    results.sort((a, b) => a.waiting - b.waiting);

    const best = results[0];

    const metrics = [
        { title: "Average Waiting Time", key: "waiting", color: "#7165e9" },
        { title: "Average Turnaround Time", key: "turnaround", color: "#3ebd9a" },
        { title: "Average Response Time", key: "response", color: "#eea65b" }
    ];

    document.getElementById("comparisonResult").innerHTML = `
        <div class="best-algorithm">
            🏆 Best algorithm by average waiting time:
            <strong>${best.name}</strong>
        </div>

        <div class="table-wrap">
            <table>
                <thead>
                    <tr>
                        <th>ALGORITHM</th>
                        <th>AVG WAIT</th>
                        <th>AVG TURNAROUND</th>
                        <th>AVG RESPONSE</th>
                        <th>CPU USAGE</th>
                    </tr>
                </thead>
                <tbody>
                    ${results.map((r, i) => `
                        <tr>
                            <td>${i === 0 ? "🏆 " : ""}${escapeHtml(r.name)}</td>
                            <td>${r.waiting.toFixed(2)}</td>
                            <td>${r.turnaround.toFixed(2)}</td>
                            <td>${r.response.toFixed(2)}</td>
                            <td>${r.utilization.toFixed(2)}%</td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>

        <div class="performance-graphs">
            <h3>📊 Performance Analytics</h3>
            <p>Visual comparison of all six scheduling algorithms.</p>

            <div class="graph-grid">
                ${metrics.map(metric => {
                    const maxValue = Math.max(
                        ...results.map(r => r[metric.key]),
                        0.01
                    );

                    return `
                        <div class="graph-card">
                            <h4>${metric.title}</h4>

                            <div class="graph-bars">
                                ${results.map(r => {
                                    const value = r[metric.key];
                                    const width = (value / maxValue) * 100;

                                    return `
                                        <div class="graph-row">
                                            <span class="graph-label">
                                                ${escapeHtml(r.name)}
                                            </span>

                                            <div class="graph-track">
                                                <div class="graph-fill"
                                                    style="width:${width}%; background:${metric.color};">
                                                </div>
                                            </div>

                                            <strong>${value.toFixed(2)}</strong>
                                        </div>
                                    `;
                                }).join("")}
                            </div>

                            <small>Lower values are generally better.</small>
                        </div>
                    `;
                }).join("")}
            </div>
        </div>
    `;
});




// LIVE CPU UTILIZATION MONITOR

function updateCpuMonitor() {
    if (!lastResult) return;

    const completedSegments =
        lastResult.segments.slice(0, currentStep);

    let busy = 0;
    let idle = 0;

    completedSegments.forEach(segment => {
        const duration = segment.end - segment.start;

        if (segment.id === "IDLE") {
            idle += duration;
        } else {
            busy += duration;
        }
    });

    const elapsed = busy + idle;

    const utilization = elapsed > 0
        ? (busy / elapsed) * 100
        : 0;

    document.getElementById("cpuUsage").textContent =
        utilization.toFixed(1) + "%";

    document.getElementById("cpuUsageBar").style.width =
        utilization + "%";

    document.getElementById("busyTime").textContent = busy;

    document.getElementById("idleTime").textContent = idle;

    document.getElementById("elapsedTime").textContent = elapsed;
}

// CONTEXT SWITCHING MONITOR

function updateContextMonitor() {
    if (!lastResult) return;

    const segments = lastResult.segments.slice(0, currentStep);

    const completed = segments.filter(s => s.id !== "IDLE");

    let switches = 0;

    for (let i = 1; i < completed.length; i++) {
        if (completed[i].id !== completed[i - 1].id) {
            switches++;
        }
    }

    const cost = Math.max(
        0,
        Number(document.getElementById("switchCost").value) || 0
    );

    const overhead = switches * cost;

    const busy = completed.reduce(
        (sum, s) => sum + s.end - s.start, 0
    );

    const rate = busy > 0
        ? (overhead / (busy + overhead)) * 100
        : 0;

    document.getElementById("contextSwitches").textContent = switches;

    document.getElementById("switchOverhead").textContent =
        overhead.toFixed(2);

    document.getElementById("switchRate").textContent =
        rate.toFixed(2) + "%";
}

document.getElementById("switchCost").addEventListener(
    "input",
    updateContextMonitor
);

// FEATURE 7: PERFORMANCE COMPARISON GRAPHS

function renderComparisonGraphs(results) {
    const metrics = [
        {
            title: "Average Waiting Time",
            key: "waiting",
            unit: "time units",
            color: "#7165e9"
        },
        {
            title: "Average Turnaround Time",
            key: "turnaround",
            unit: "time units",
            color: "#3ebd9a"
        },
        {
            title: "Average Response Time",
            key: "response",
            unit: "time units",
            color: "#eea65b"
        }
    ];

    const graphHTML = `
        <div class="performance-graphs">
            <h3>📊 Performance Analytics</h3>
            <p>Compare the performance of all six CPU scheduling algorithms.</p>

            <div class="graph-grid">
                ${metrics.map(metric => {
                    const maxValue = Math.max(
                        ...results.map(r => r[metric.key]),
                        0.01
                    );

                    return `
                        <div class="graph-card">
                            <h4>${metric.title}</h4>

                            <div class="graph-bars">
                                ${results.map(r => {
                                    const value = r[metric.key];
                                    const width = (value / maxValue) * 100;

                                    return `
                                        <div class="graph-row">
                                            <span class="graph-label">
                                                ${escapeHtml(r.name)}
                                            </span>

                                            <div class="graph-track">
                                                <div
                                                    class="graph-fill"
                                                    style="
                                                        width:${width}%;
                                                        background:${metric.color};
                                                    ">
                                                </div>
                                            </div>

                                            <strong>${value.toFixed(2)}</strong>
                                        </div>
                                    `;
                                }).join("")}
                            </div>

                            <small>Measured in ${metric.unit}</small>
                        </div>
                    `;
                }).join("")}
            </div>

            <div class="graph-note">
                💡 Lower waiting, turnaround and response times generally
                indicate better performance.
            </div>
        </div>
    `;

    document.getElementById("comparisonResult")
        .insertAdjacentHTML("beforeend", graphHTML);
}



// DARK / LIGHT MODE TOGGLE

const themeToggle = document.getElementById("themeToggle");

// Always start in DARK MODE
document.body.classList.remove("light-mode");
localStorage.setItem("cpuSimulatorTheme", "dark");

themeToggle.textContent = "☀️ Switch to Light Mode";

themeToggle.addEventListener("click", function () {
    document.body.classList.toggle("light-mode");

    const isLight = document.body.classList.contains("light-mode");

    themeToggle.textContent = isLight
        ? "🌙 Switch to Dark Mode"
        : "☀️ Switch to Light Mode";

    localStorage.setItem(
        "cpuSimulatorTheme",
        isLight ? "light" : "dark"
    );
});
// PDF SIMULATION REPORT

document.getElementById("pdfBtn").addEventListener("click", function () {

    if (!lastResult) {
        alert("Please run a simulation before downloading the report!");
        return;
    }

    if (!window.jspdf) {
        alert("PDF library not loaded. Please refresh the page.");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.text("CPU Scheduling Simulation Report", 15, 20);

    doc.setFontSize(11);
    doc.text("Algorithm: " + lastResult.algo.toUpperCase(), 15, 35);
    doc.text("Average Waiting Time: " + lastResult.avgWaiting.toFixed(2), 15, 45);
    doc.text("Average Turnaround Time: " + lastResult.avgTurnaround.toFixed(2), 15, 55);
    doc.text("Average Response Time: " + lastResult.avgResponse.toFixed(2), 15, 65);
    doc.text("Total Execution Time: " + lastResult.totalTime, 15, 75);

    doc.setFontSize(14);
    doc.text("Process Details", 15, 90);

    let y = 100;

    doc.setFontSize(10);

    doc.text("PID       Arrival       Burst       Waiting       Turnaround", 15, y);
    y += 8;

    lastResult.rows.forEach(process => {

        if (y > 270) {
            doc.addPage();
            y = 20;
        }

        doc.text(
            `${process.id}          ${process.arrival}          ${process.burst}          ${process.waiting}          ${process.turnaround}`,
            15,
            y
        );

        y += 8;
    });

    doc.save("CPU_Scheduling_Report.pdf");

    alert("PDF report downloaded successfully!");
});
// ===================================
// PDF SIMULATION REPORT
// ===================================

const pdfButton = document.getElementById("pdfBtn");

if (pdfButton) {
    pdfButton.addEventListener("click", function () {

        if (!lastResult) {
            alert("Please run a simulation first!");
            return;
        }

        if (!window.jspdf || !window.jspdf.jsPDF) {
            alert("PDF library not loaded. Check your internet connection.");
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        doc.setFontSize(20);
        doc.text("CPU Scheduling Simulator Report", 15, 20);

        doc.setFontSize(12);
        doc.text("Algorithm: " + lastResult.algo.toUpperCase(), 15, 35);
        doc.text("Average Waiting Time: " + lastResult.avgWaiting.toFixed(2), 15, 45);
        doc.text("Average Turnaround Time: " + lastResult.avgTurnaround.toFixed(2), 15, 55);
        doc.text("Average Response Time: " + lastResult.avgResponse.toFixed(2), 15, 65);
        doc.text("Total Execution Time: " + lastResult.totalTime, 15, 75);

        doc.setFontSize(15);
        doc.text("Process Details", 15, 90);

        let y = 102;

        doc.setFontSize(10);
        doc.text("PID | Arrival | Burst | Waiting | Turnaround", 15, y);

        y += 9;

        lastResult.rows.forEach(process => {
            if (y > 275) {
                doc.addPage();
                y = 20;
            }

            doc.text(
                `${process.id} | ${process.arrival} | ${process.burst} | ${process.waiting} | ${process.turnaround}`,
                15,
                y
            );

            y += 8;
        });

        doc.save("CPU_Scheduling_Report.pdf");
    });
}
// PROCESS STARVATION DETECTION

function detectStarvation() {

    const status = document.getElementById("starvationStatus");
    const results = document.getElementById("starvationResults");

    if (!status || !results) return;

    if (!lastResult || !lastResult.rows) {
        status.textContent = "Run a simulation to analyze starvation.";
        results.innerHTML = "";
        return;
    }

    const threshold = 10;

    const starvingProcesses = lastResult.rows.filter(
        process => Number(process.waiting) >= threshold
    );

    if (starvingProcesses.length > 0) {

        status.textContent = "⚠️ Potential starvation detected!";

        results.innerHTML = starvingProcesses.map(process => `
            <div class="starvation-warning">
                <strong>${process.id}</strong>
                — Waiting time: ${process.waiting} units
            </div>
        `).join("");

    } else {

        status.textContent = "All processes completed without excessive waiting.";

        results.innerHTML = `
            <div class="starvation-safe">
                ✅ No potential starvation detected.
            </div>
        `;
    }
}