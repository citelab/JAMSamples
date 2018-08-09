#!/bin/bash


# 0 Warmup Time
gnuplot -persist <<-EOFMarker
set terminal pngcairo enhanced font 'Times,16'
set key box width -1
set key box height +1
set key box
set key right top
# set title "Warmup Time"
set output "output/warmup.png"
set ytics ("0" 0, "0.5" 0.5e6, "1" 1e6, "1.5" 1.5e6, "2" 2e6, "2.5" 2.5e6, "3" 3e6)
set yrange[0:3000000]
set xrange[0:500]
set ylabel "Time per call in ms"
set xlabel "Calls"
# f(x) = a*x**4+b*x**3+c*x**2+d*x+e
# fit f(x) 'warmUp.txt' via a, b, c, d, e
plot "warmUpAsync.txt" smooth bezier title "Async Calls" lw 2, \
"warmUpSync.txt" smooth bezier title "Sync Calls" lw 2
# f(x)
EOFMarker


# 1 Sequential vs Parallel Async
gnuplot -persist <<-EOFMarker
set terminal pngcairo enhanced font 'Helvetica,16'
set key box
set key right bottom
set key box height +1
# set title "Parallel vs Sequential Async Calls"
set output "output/parallelSequentialAsync.png"
# set ytics ("0" 0, "100" 1e8, "200" 2e8, "300" 3e8, "400" 4e8, "500" 5e8, "600" 6e8, "700" 7e8)
set xtics ("0.3" 300000, "0.4" 400000, "0.5" 500000, "0.6" 600000, "0.7" 700000, "0.8" 800000, "0.9" 900000)
set xlabel "Call time in ms"
set ylabel "F(x)"
set yrange [0:1]
set xrange[300000:900000]
plot "seqAsync.txt" u 1:(1./1000.) smooth cumulative title "Sequential" lw 2, \
"parAsync.txt" u 1:(1./1000.) smooth cumulative title "Parallel" lw 2
EOFMarker


# 2 Jcond vs No Jcond
gnuplot -persist <<-EOFMarker
set terminal pngcairo enhanced font 'Helvetica,16'
set key box height +1 
set key box
set key right bottom
# set title "JCondition Delay"
set output "output/jcond.png"
# set ytics ("0" 0, "100" 1e8, "200" 2e8, "300" 3e8, "400" 4e8, "500" 5e8, "600" 6e8, "700" 7e8)
set xtics ("0.3" 300000, "0.35" 350000, "0.4" 400000, "0.45" 450000, "0.5" 500000, "0.55" 550000, "0.6" 600000)
set xlabel "Call time in ms"
set ylabel "F(x)"
set yrange [0:1]
set xrange[300000:600000]
plot "sync.txt" u 1:(1./1000.) smooth cumulative title "No JCondition" lw 2, \
"syncCond.txt" u 1:(1./1000.) smooth cumulative title "JCondition" lw 2
EOFMarker


# 3 J2C async vs c2j async
gnuplot -persist <<-EOFMarker
set terminal pngcairo enhanced font 'Helvetica,16'
set key box width -3
set key box height +1
set key box
set key right bottom
# set title "Async Call Language Source (Sequential)"
set output "output/asyncLanguages.png"
# set ytics ("0" 0, "100" 1e8, "200" 2e8, "300" 3e8, "400" 4e8, "500" 5e8, "600" 6e8, "700" 7e8)
set xtics ("0.3" 300000, "0.4" 400000, "0.5" 500000, "0.6" 600000, "0.7" 700000, "0.8" 800000, "0.9" 900000)
set xlabel "Call time in ms"
set ylabel "F(x)"
set xrange[300000:900000]
set yrange [0:1]
plot "seqAsync.txt" u 1:(1./1000.) smooth cumulative title "JavaScript calling C" lw 2, \
"parAsync.txt" u 1:(1./1000.) smooth cumulative title "C calling JavaScript" lw 2
EOFMarker


# 4 C2J async vs sync one way
gnuplot -persist <<-EOFMarker
set terminal pngcairo enhanced font 'Helvetica,16'
set key box
set key right bottom
set key box width +1
set key box height +1
# set title "Sync vs Async Call"
set output "output/asyncSync.png"
# set ytics ("0" 0, "100" 1e8, "200" 2e8, "300" 3e8, "400" 4e8, "500" 5e8, "600" 6e8, "700" 7e8)
set xtics ("0.3" 300000, "0.4" 400000, "0.5" 500000, "0.6" 600000, "0.7" 700000, "0.8" 800000, "0.9" 900000)
set xlabel "Call time in ms"
set ylabel "F(x)"
set yrange [0:1]
set xrange[300000:900000]
plot "parAsync.txt" u 1:(1./1000.) smooth cumulative title "Asynchronous" lw 2, \
"sync.txt" u 1:(1./1000.) smooth cumulative title "Synchronous" lw 2
EOFMarker


# 5 C2J Sync one way vs roundtrip
gnuplot -persist <<-EOFMarker
set terminal pngcairo enhanced font 'Helvetica,16'
set key box
set key right bottom
set key box height +1
# set title "One Way Sync Time vs Round Trip Return Time"
set output "output/syncRoundtrip.png"
# set ytics ("0" 0, "100" 1e8, "200" 2e8, "300" 3e8, "400" 4e8, "500" 5e8, "600" 6e8, "700" 7e8, "800" 8e8)
set xtics ("0.3" 300000, "0.4" 400000, "0.5" 500000, "0.6" 600000, "0.7" 700000, "0.8" 800000, "0.9" 900000, "1.0" 1000000, "1.1" 1100000)
set xlabel "Call time in ms"
set ylabel "F(x)"
set yrange [0:1]
set xrange[300000:1100000]
plot "sync.txt" u 1:(1./1000.) smooth cumulative title "One Way" lw 2, \
"syncRound.txt" u 1:(1./1000.) smooth cumulative title "Roundtrip" lw 2
EOFMarker


# 6 Logger with varying number of C nodes
gnuplot -persist <<-EOFMarker
set terminal pngcairo enhanced font 'Helvetica,16'
set key box width -1
set key box height +1
set key box
set key right bottom
# set title "Logger Reaction Time"
set output "output/logger.png"
# set ytics ("0" 0, "2" 2e9, "4" 4e9, "6" 6e9, "8" 8e9, "10" 1e10, "12" 1.2e10)
set xtics ("0.2" 200000, "0.4" 400000, "0.6" 600000, "0.8" 800000, "1.0" 1000000, "1.2" 1200000)
set xlabel "Reaction time in ms"
set ylabel "F(x)"
set yrange [0:1]
set xrange[200000:1200000]
plot "logger_t1.txt" u 1:(1./1000.) smooth cumulative title "One C Device" lw 2, \
"logger_t2.txt" u 1:(1./1000.) smooth cumulative title "Two C Devices" lw 2, \
"logger_t4.txt" u 1:(1./1000.) smooth cumulative title "Four C Devices" lw 2, \
"logger_t8.txt" u 1:(1./1000.) smooth cumulative title "Eight C Devices" lw 2
EOFMarker

# 7 Broadcaster with varying number of C nodes
gnuplot -persist <<-EOFMarker
set terminal pngcairo enhanced font 'Helvetica,16'
set key box width -1
set key box height +1
set key box
set key right bottom
# set title "Broadcaster Reaction Time"
set output "output/broadcaster.png"
# set ytics ("0" 0, "0.5" 5e8, "1" 1e9, "1.5" 1.5e9, "2" 2e9, "2.5" 2.5e9)
set xtics ("1.6" 1600000, "1.7" 1700000, "1.8" 1800000, "1.9" 1900000, "2.0" 2000000, "2.1" 2100000, "2.2" 2200000, "2.3" 2300000, "2.4" 2400000)
set xlabel "Reaction time in ms"
set ylabel "F(x)"
set yrange [0:1]
set xrange[1600000:2400000]
plot "broadcaster_t1.txt" u 1:(1./1000.) smooth cumulative title "One C Device" lw 2, \
"broadcaster_t2.txt" u 1:(1./1000.) smooth cumulative title "Two C Devices" lw 2, \
"broadcaster_t4.txt" u 1:(1./1000.) smooth cumulative title "Four C Devices" lw 2, \
"broadcaster_t8.txt" u 1:(1./1000.) smooth cumulative title "Eight C Devices" lw 2
EOFMarker