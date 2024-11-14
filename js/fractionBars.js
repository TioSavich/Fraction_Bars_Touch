// fractionBars.js

// Fraction Bars Application
// Consolidated and Refactored JavaScript

// Utility Class
class Utilities {
    constructor() {
        this.shiftKeyDown = false;
        this.ctrlKeyDown = false;
        this.file_list = [];
        this.file_index = 0;
        this.flag = [false, false, false, false];
        this.USE_CURRENT_SELECTION = 'useCurrent';
        this.USE_LAST_SELECTION = 'useLast';
    }

    static include_js(file, path) {
        if (path) {
            file = path + file;
        }
        const include_file = document.createElement('script');
        include_file.type = 'text/javascript';
        include_file.src = file;
        document.getElementsByTagName('head')[0].appendChild(include_file);
    }

    static createFraction(numerator, denominator) {
        // Simple fraction creation
        if (denominator === 0) return "Undefined";
        const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
        const divisor = gcd(numerator, denominator);
        return `${numerator / divisor}/${denominator / divisor}`;
    }

    static log(msg) {
        if (window.console) {
            console.log(msg);
        }
    }

    static colorLuminance(hex, lum) {
        // Validate hex string
        hex = String(hex).replace(/[^0-9a-f]/gi, '');
        if (hex.length < 6) {
            hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
        }
        lum = lum || 0;

        // Convert to decimal and change luminosity
        let rgb = "#", c, i;
        for (i = 0; i < 3; i++) {
            c = parseInt(hex.substr(i*2,2), 16);
            c = Math.round(Math.min(Math.max(0, c + (c * lum)), 255)).toString(16);
            rgb += ("00"+c).substr(c.length);
        }

        return rgb;
    }

    static getMarkedIterateFlag() {
        // Returns false by default
        const flag = document.getElementById('marked-iterate');
        return flag && flag.getAttribute('data-flag') === "true";
    }
}

const utilities = new Utilities();

// Point Class
class Point {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    static createFromMouseEvent(event, elem) {
        if (!(elem instanceof Element)) {
            throw new TypeError('elem must be a DOM Element');
        }
        const rect = elem.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        return new Point(x, y);
    }

    static min(p1, p2) {
        return new Point(Math.min(p1.x, p2.x), Math.min(p1.y, p2.y));
    }

    copy() {
        return new Point(this.x, this.y);
    }
}

// Split Class
class Split {
    constructor(x, y, w, h, color) {
        this.x = x || 0;
        this.y = y || 0;
        this.w = w || 0;
        this.h = h || 0;
        this.color = color || '#000000';
        this.isSelected = false;
    }

    equals(otherSplit) {
        return this.x === otherSplit.x && this.y === otherSplit.y &&
               this.w === otherSplit.w && this.h === otherSplit.h &&
               this.color === otherSplit.color;
    }

    copy() {
        const newSplit = new Split(this.x, this.y, this.w, this.h, this.color);
        newSplit.isSelected = this.isSelected;
        return newSplit;
    }
}

// Mat Class
class Mat {
    constructor(x, y, w, h, color) {
        this.x = x || 0;
        this.y = y || 0;
        this.w = w || 0;
        this.h = h || 0;
        this.color = color || '#FFFFFF';
        this.isSelected = false;
    }

    copy() {
        const newMat = new Mat(this.x, this.y, this.w, this.h, this.color);
        newMat.isSelected = this.isSelected;
        return newMat;
    }
}

// Bar Class
class Bar {
    constructor(x, y, w, h, type, color) {
        this.x = x || 0;
        this.y = y || 0;
        this.w = w || 0;
        this.h = h || 0;
        this.size = this.w * this.h;
        this.color = color || '#000000';
        this.type = type || 'bar';
        this.splits = [];
        this.label = '';
        this.isUnitBar = false;
        this.fraction = '';
        this.isSelected = false;
        this.repeatUnit = null;
        this.selectedSplit = null;
    }

    measure(targetBar) {
        this.fraction = Utilities.createFraction(this.size, targetBar.size);
    }

    clearMeasurement() {
        this.fraction = '';
    }

    addSplit(x, y, w, h, color) {
        const newSplit = new Split(x, y, w, h, color);
        // Avoid duplicates
        if (!this.splits.some(split => split.equals(newSplit))) {
            this.splits.push(newSplit);
        }
    }

    clearSplits() {
        this.splits = [];
    }

    copySplits() {
        return this.splits.map(split => split.copy());
    }

    hasSelectedSplit() {
        return this.splits.some(split => split.isSelected);
    }

    updateColorOfSelectedSplit(newColor) {
        this.splits.forEach(split => {
            if (split.isSelected) {
                split.color = newColor;
            }
        });
    }

    clearSplitSelection() {
        this.selectedSplit = null;
        this.splits.forEach(split => split.isSelected = false);
    }

    updateSplitSelectionFromState() {
        this.selectedSplit = this.splits.find(split => split.isSelected) || null;
    }

    selectSplit(mouseLoc) {
        this.selectedSplit = this.splits.find(split => 
            mouseLoc.x > this.x + split.x &&
            mouseLoc.x < this.x + split.x + split.w &&
            mouseLoc.y > this.y + split.y &&
            mouseLoc.y < this.y + split.y + split.h
        ) || null;

        if (this.selectedSplit) {
            this.clearSplitSelection();
            this.selectedSplit.isSelected = true;
        }
    }

    findSplitForPoint(p) {
        return this.splits.find(split =>
            p.x > this.x + split.x &&
            p.x < this.x + split.x + split.w &&
            p.y > this.y + split.y &&
            p.y < this.y + split.y + split.h
        ) || null;
    }

    splitBarAtPoint(splitPoint, isVertical) {
        const theSplit = this.findSplitForPoint(splitPoint);
        if (theSplit) {
            // Splitting an existing split
            if (isVertical) {
                const newWidth = splitPoint.x - (this.x + theSplit.x);
                const remainingWidth = theSplit.w - newWidth;
                this.addSplit(theSplit.x, theSplit.y, newWidth, theSplit.h, theSplit.color);
                this.addSplit(theSplit.x + newWidth, theSplit.y, remainingWidth, theSplit.h, theSplit.color);
            } else {
                const newHeight = splitPoint.y - (this.y + theSplit.y);
                const remainingHeight = theSplit.h - newHeight;
                this.addSplit(theSplit.x, theSplit.y, theSplit.w, newHeight, theSplit.color);
                this.addSplit(theSplit.x, theSplit.y + newHeight, theSplit.w, remainingHeight, theSplit.color);
            }
            this.splits = this.splits.filter(split => split !== theSplit);
        } else {
            // Adding a new split
            if (isVertical) {
                const newWidth = splitPoint.x - this.x;
                const remainingWidth = this.w - newWidth;
                this.addSplit(0, 0, newWidth, this.h, this.color);
                this.addSplit(newWidth, 0, remainingWidth, this.h, this.color);
            } else {
                const newHeight = splitPoint.y - this.y;
                const remainingHeight = this.h - newHeight;
                this.addSplit(0, 0, this.w, newHeight, this.color);
                this.addSplit(0, newHeight, this.w, remainingHeight, this.color);
            }
        }
    }

    splitSelectedSplit(numSplits, isVertical) {
        this.updateSplitSelectionFromState();
        if (!this.selectedSplit) return;

        const interval = isVertical ? this.selectedSplit.w / numSplits : this.selectedSplit.h / numSplits;
        const newSplits = [];

        for (let i = 0; i < numSplits; i++) {
            if (isVertical) {
                newSplits.push(new Split(this.selectedSplit.x + i * interval, this.selectedSplit.y, interval, this.selectedSplit.h, this.selectedSplit.color));
            } else {
                newSplits.push(new Split(this.selectedSplit.x, this.selectedSplit.y + i * interval, this.selectedSplit.w, interval, this.selectedSplit.color));
            }
        }

        this.splits = this.splits.filter(split => split !== this.selectedSplit).concat(newSplits);
        this.clearSplitSelection();
    }

    breakApart() {
        if (this.splits.length === 0) {
            return [this.copy(false)];
        } else {
            return this.splits.map(split => new Bar(this.x + split.x, this.y + split.y, split.w, split.h, 'bar', split.color));
        }
    }

    copy(withOffset = false) {
        const offset = withOffset ? 10 : 0;
        const newBar = new Bar(
            this.x + offset,
            this.y + offset,
            this.w,
            this.h,
            this.type,
            this.color
        );
        newBar.size = this.size;
        newBar.splits = this.copySplits();
        newBar.label = this.label;
        newBar.isUnitBar = this.isUnitBar;
        newBar.fraction = this.fraction;
        newBar.isSelected = this.isSelected;
        newBar.repeatUnit = this.repeatUnit ? this.repeatUnit.copy() : null;
        return newBar;
    }

    makeCopy() {
        return this.copy(false);
    }

    makeNewCopy(withHeight = 1) {
        const newBar = new Bar(
            this.x,
            this.y + this.h + 10,
            this.w * withHeight,
            this.h,
            this.type,
            this.color
        );
        newBar.size = this.size * withHeight;
        return newBar;
    }

    repeat(clickLoc) {
        if (!this.repeatUnit) {
            alert("Tried to Repeat when no repeatUnit was set.");
            return;
        }

        const repeatedBar = this.repeatUnit.copy(true);
        repeatedBar.x = this.repeatUnit.x - 5;
        repeatedBar.y = this.repeatUnit.y - 5;

        this.join(repeatedBar);

        if (this.splits.length === 2 && !this.repeatUnit.splits.length && utilities.getMarkedIterateFlag()) {
            this.splits[1].color = Utilities.colorLuminance(this.splits[0].color, -0.1);
        }
    }

    iterate(iterateNum, isVertical) {
        const offset = 3;
        let currentBar = this.copy(false);

        for (let i = 1; i < iterateNum; i++) {
            currentBar = currentBar.copy(false);
            if (isVertical) {
                currentBar.y += offset;
            } else {
                currentBar.x += offset;
            }
            this.join(currentBar);
        }

        if (this.splits.length === 0 && this.size > 0 && utilities.getMarkedIterateFlag()) {
            this.color = Utilities.colorLuminance(this.color, -0.1);
        }
    }

    join(otherBar) {
        const distance = Bar.distanceBetween(this, otherBar);
        const verticalMatch = this.h === otherBar.h;
        const horizontalMatch = this.w === otherBar.w;

        if (!verticalMatch && !horizontalMatch) {
            alert("To Join, bars must have a matching dimension in height or width.");
            return false;
        }

        if (verticalMatch) {
            if (distance.x < distance.y) {
                this.w += otherBar.w;
            } else {
                this.h += otherBar.h;
            }
        } else if (horizontalMatch) {
            if (distance.y < distance.x) {
                this.h += otherBar.h;
            } else {
                this.w += otherBar.w;
            }
        }

        this.size = this.w * this.h;
        this.clearSplits();

        // Merge splits from both bars
        this.splits = this.splits.concat(otherBar.splits.map(split => split.copy()));
        this.clearMeasurement();
        return true;
    }

    static distanceBetween(bar1, bar2) {
        const center1 = new Point(bar1.x + bar1.w / 2, bar1.y + bar1.h / 2);
        const center2 = new Point(bar2.x + bar2.w / 2, bar2.y + bar2.h / 2);
        return new Point(center2.x - center1.x, center2.y - center1.y);
    }

    nearestEdge(p) {
        const edges = {
            left: Math.abs(p.x - this.x),
            right: Math.abs((this.x + this.w) - p.x),
            top: Math.abs(p.y - this.y),
            bottom: Math.abs((this.y + this.h) - p.y)
        };
        return Object.keys(edges).reduce((a, b) => edges[a] < edges[b] ? a : b);
    }

    toggleSelection() {
        this.isSelected = !this.isSelected;
    }

    setRepeatUnit() {
        this.repeatUnit = this.makeCopy();
        this.repeatUnit.unPastel();
    }

    unPastel() {
        // Implement unPastel functionality if needed
    }

    // Static Methods for Classes
    static copyFromJSON(jsonData) {
        const bar = new Bar(jsonData.x, jsonData.y, jsonData.w, jsonData.h, jsonData.type, jsonData.color);
        bar.size = jsonData.size;
        bar.label = jsonData.label;
        bar.isUnitBar = jsonData.isUnitBar;
        bar.fraction = jsonData.fraction;
        bar.isSelected = jsonData.isSelected;
        bar.splits = jsonData.splits.map(splitData => new Split(splitData.x, splitData.y, splitData.w, splitData.h, splitData.color));
        bar.repeatUnit = jsonData.repeatUnit ? Bar.copyFromJSON(jsonData.repeatUnit) : null;
        return bar;
    }
}

// Line Class
class Line {
    constructor(x1, y1, x2, y2) {
        this.x1 = x1 || 0;
        this.y1 = y1 || 0;
        this.x2 = x2 || 0;
        this.y2 = y2 || 0;
    }

    equals(otherLine) {
        if (!otherLine) return false;
        return this.x1 === otherLine.x1 && this.y1 === otherLine.y1 &&
               this.x2 === otherLine.x2 && this.y2 === otherLine.y2;
    }
}

// CanvasState Class
class CanvasState {
    constructor(fbCanvas) {
        this.mFBCanvas = fbCanvas;
        this.mBars = [];
        this.mMats = [];
        this.mUnitBar = null;
        this.mHidden = [];
    }

    grabBarsAndMats() {
        this.mBars = this.mFBCanvas.bars.map(bar => bar.copy(false));
        this.mMats = this.mFBCanvas.mats.map(mat => mat.copy(false));

        this.mUnitBar = this.mFBCanvas.unitBar ? this.mFBCanvas.unitBar.copy(false) : null;

        this.mHidden = [...hiddenButtonsName];
    }
}

// SplitsWidget Class
class SplitsWidget {
    constructor(context) {
        this.context = context;
        this.vertical = true;
        this.num_splits = 2;
        this.color = "yellow";
    }

    handleSliderChange(event, ui) {
        this.num_splits = ui.value;
        this.refreshCanvas();
    }

    handleVertHorizChange(event) {
        const checkedValue = document.querySelector('input[name="vert_horiz"]:checked').value;
        this.vertical = (checkedValue === "Vertical");
        this.refreshCanvas();
    }

    refreshCanvas() {
        const width = this.context.canvas.width;
        const height = this.context.canvas.height;

        // Clear canvas
        this.context.clearRect(0, 0, width, height);
        this.context.fillStyle = this.color;
        this.context.fillRect(0, 0, width, height);

        // Draw splits
        this.context.strokeStyle = "#FF3333";
        this.context.lineWidth = 2;
        if (this.vertical) {
            const splitWidth = width / this.num_splits;
            for (let i = 1; i < this.num_splits; i++) {
                this.context.beginPath();
                this.context.moveTo(i * splitWidth, 0);
                this.context.lineTo(i * splitWidth, height);
                this.context.stroke();
            }
        } else {
            const splitHeight = height / this.num_splits;
            for (let i = 1; i < this.num_splits; i++) {
                this.context.beginPath();
                this.context.moveTo(0, i * splitHeight);
                this.context.lineTo(width, i * splitHeight);
                this.context.stroke();
            }
        }
    }
}

// FractionBarsCanvas Class
class FractionBarsCanvas {
    constructor(context) {
        this.context = context;
        this.bars = [];
        this.mats = [];
        this.unitBar = null;
        this.selectedBars = [];
        this.selectedMats = [];
        this.currentAction = null;
        this.undoStack = [];
        this.redoStack = [];
        this.mouseDownLoc = null;
        this.mouseUpLoc = null;
        this.mouseLastLoc = null;
        this.found_a_drag = false;
        this.manualSplitPoint = null;
    }

    // Event Handlers
    addUndoState() {
        const state = this.saveState();
        this.undoStack.push(state);
        // Clear redo stack
        this.redoStack = [];
    }

    undo() {
        if (this.undoStack.length === 0) return;
        const state = this.undoStack.pop();
        this.redoStack.push(this.saveState());
        this.restoreState(state);
        this.refreshCanvas();
    }

    redo() {
        if (this.redoStack.length === 0) return;
        const state = this.redoStack.pop();
        this.undoStack.push(this.saveState());
        this.restoreState(state);
        this.refreshCanvas();
    }

    saveState() {
        return {
            bars: this.bars.map(bar => bar.copy()),
            mats: this.mats.map(mat => mat.copy()),
            unitBar: this.unitBar ? this.unitBar.copy() : null
        };
    }

    restoreState(state) {
        this.bars = state.bars.map(bar => bar.copy());
        this.mats = state.mats.map(mat => mat.copy());
        this.unitBar = state.unitBar ? state.unitBar.copy() : null;
        this.clearSelection();
    }

    cacheUndoState() {
        this.addUndoState();
    }

    handleToolUpdate(toolName, toolOn) {
        this.currentAction = toolOn ? toolName : null;
        this.clearSelection();
        this.refreshCanvas();
    }

    // Utility Methods
    decycle(key, value) {
        // Prevent circular references
        if (typeof value === "object" && value !== null) {
            if (value instanceof Bar || value instanceof Mat || value instanceof Split) {
                return undefined; // Skip these objects to prevent circularity
            }
        }
        return value;
    }

    // Selection Methods
    clearSelection() {
        this.selectedBars.forEach(bar => bar.isSelected = false);
        this.selectedMats.forEach(mat => mat.isSelected = false);
        this.selectedBars = [];
        this.selectedMats = [];
        this.refreshCanvas();
    }

    removeBarFromSelection(bar) {
        const index = this.selectedBars.indexOf(bar);
        if (index > -1) {
            this.selectedBars.splice(index, 1);
            bar.isSelected = false;
        }
    }

    removeMatFromSelection(mat) {
        const index = this.selectedMats.indexOf(mat);
        if (index > -1) {
            this.selectedMats.splice(index, 1);
            mat.isSelected = false;
        }
    }

    // Add Methods
    addBar(bar = null) {
        if (!bar) {
            // Create a new bar based on mouse positions
            const p1 = this.mouseDownLoc;
            const p2 = this.mouseUpLoc;
            const start = Point.min(p1, p2);
            const width = Math.abs(p2.x - p1.x);
            const height = Math.abs(p2.y - p1.y);
            if (width > 10 && height > 10) { // Minimum size
                const newBar = new Bar(start.x, start.y, width, height, 'bar', this.currentFillColor || '#000000');
                this.bars.push(newBar);
            }
        } else {
            this.bars.push(bar);
        }
    }

    addMat(mat = null) {
        if (!mat) {
            const p1 = this.mouseDownLoc;
            const p2 = this.mouseUpLoc;
            const start = Point.min(p1, p2);
            const width = Math.abs(p2.x - p1.x);
            const height = Math.abs(p2.y - p1.y);
            if (width > 10 && height > 10) {
                const newMat = new Mat(start.x, start.y, width, height, this.currentFillColor || '#FFFFFF');
                this.mats.push(newMat);
            }
        } else {
            this.mats.push(mat);
        }
    }

    copyBars() {
        const copiedBars = this.selectedBars.map(bar => bar.copy(true));
        this.bars = this.bars.concat(copiedBars);
    }

    deleteSelectedBars() {
        this.bars = this.bars.filter(bar => !bar.isSelected);
        this.mats = this.mats.filter(mat => !mat.isSelected);
        this.clearSelection();
    }

    joinSelected() {
        if (this.selectedBars.length < 2) return;
        let baseBar = this.selectedBars[0];
        for (let i = 1; i < this.selectedBars.length; i++) {
            baseBar.join(this.selectedBars[i]);
        }
        this.bars = this.bars.filter(bar => !this.selectedBars.includes(bar));
        this.selectedBars = [baseBar];
        baseBar.isSelected = true;
        this.refreshCanvas();
    }

    setUnitBar() {
        if (this.selectedBars.length !== 1) {
            alert("Please select exactly one bar to set as Unit Bar.");
            return;
        }
        this.unitBar = this.selectedBars[0].copy(false);
        this.unitBar.isUnitBar = true;
        this.refreshCanvas();
    }

    measureBars() {
        if (!this.unitBar) {
            alert("Please set a Unit Bar first.");
            return;
        }
        this.bars.forEach(bar => {
            if (!bar.isUnitBar) {
                bar.measure(this.unitBar);
            }
        });
        this.refreshCanvas();
    }

    make() {
        // Open the "Make Fraction Bar" dialog
        $("#dialog-make").dialog("open");
    }

    makeSplits(numSplits, direction, wholeOrPart) {
        this.selectedBars.forEach(bar => {
            if (direction === "Vertical") {
                bar.wholeBarSplits(numSplits, true);
            } else {
                bar.wholeBarSplits(numSplits, false);
            }
        });
        this.refreshCanvas();
    }

    makeIterations(numIterate, direction) {
        this.selectedBars.forEach(bar => {
            bar.iterate(numIterate, direction === "Vertical");
        });
        this.refreshCanvas();
    }

    split(splitWidgetObj) {
        this.selectedBars.forEach(bar => {
            bar.splitBarAtPoint(this.manualSplitPoint, splitWidgetObj.vertical);
        });
        this.manualSplitPoint = null;
        this.refreshCanvas();
    }

    pullOutSplit() {
        // Implement pull out split logic
        // Placeholder for actual implementation
        alert("Pull Out Split functionality not implemented yet.");
    }

    clearSplits() {
        this.selectedBars.forEach(bar => bar.clearSplits());
        this.refreshCanvas();
    }

    breakApartBars() {
        const newBars = [];
        this.selectedBars.forEach(bar => {
            const brokenBars = bar.breakApart();
            newBars.push(...brokenBars);
        });
        this.bars = this.bars.filter(bar => !this.selectedBars.includes(bar)).concat(newBars);
        this.clearSelection();
        this.refreshCanvas();
    }

    editLabel() {
        if (this.selectedBars.length === 0) {
            alert("Please select at least one bar to label.");
            return;
        }
        // Show the label input
        const labelInput = document.getElementById('labelInput');
        labelInput.style.display = 'block';
        labelInput.focus();
    }

    saveLabel(label, selectionType) {
        if (selectionType === utilities.USE_CURRENT_SELECTION) {
            this.selectedBars.forEach(bar => bar.label = label);
        } else if (selectionType === utilities.USE_LAST_SELECTION) {
            if (this.selectedBars.length > 0) {
                this.selectedBars[this.selectedBars.length - 1].label = label;
            }
        }
    }

    hideEditLabel() {
        const labelInput = document.getElementById('labelInput');
        labelInput.style.display = 'none';
    }

    // File Handling
    handleFileEvent(fileEvent) {
        try {
            const data = JSON.parse(fileEvent.target.result);
            this.bars = data.bars.map(barData => Bar.copyFromJSON(barData));
            this.mats = data.mats.map(matData => Mat.copyFromJSON(matData));
            this.unitBar = data.unitBar ? Bar.copyFromJSON(data.unitBar) : null;
            this.clearSelection();
            this.refreshCanvas();
        } catch (error) {
            alert("Failed to load file: " + error.message);
        }
    }

    save() {
        const data = {
            bars: this.bars,
            mats: this.mats,
            unitBar: this.unitBar
        };
        const json = JSON.stringify(data, this.decycle.bind(this), 2);
        const blob = new Blob([json], { type: "application/json;charset=utf-8" });
        saveAs(blob, "fractionBars.json");
    }

    openFileDialog() {
        $("#dialog-file").dialog("open");
    }

    handleFileSelect(event) {
        const files = event.target.files;
        if (files.length === 0) return;
        utilities.file_list = files;
        utilities.file_index = 0;
        const file = files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
            this.handleFileEvent(e);
        };
        reader.readAsText(file);
        showSelectList();
    }

    // Drawing Methods
    refreshCanvas() {
        this.context.clearRect(0, 0, this.context.canvas.width, this.context.canvas.height);
        // Draw Mats
        this.mats.forEach(mat => this.drawMat(mat));
        // Draw Bars
        this.bars.forEach(bar => this.drawBar(bar));
        // Optionally, draw unit bar differently
        if (this.unitBar) {
            this.drawBar(this.unitBar, true);
        }
    }

    drawBar(bar, isUnit = false) {
        this.context.fillStyle = bar.color;
        this.context.fillRect(bar.x, bar.y, bar.w, bar.h);

        if (bar.isSelected) {
            this.context.strokeStyle = '#FF0000';
            this.context.lineWidth = 2;
            this.context.strokeRect(bar.x, bar.y, bar.w, bar.h);
        }

        // Draw splits
        bar.splits.forEach(split => {
            this.context.fillStyle = split.color;
            this.context.fillRect(bar.x + split.x, bar.y + split.y, split.w, split.h);

            if (split.isSelected) {
                this.context.strokeStyle = '#00FF00';
                this.context.lineWidth = 2;
                this.context.strokeRect(bar.x + split.x, bar.y + split.y, split.w, split.h);
            }
        });

        // Draw label if exists
        if (bar.label) {
            this.context.fillStyle = '#000000';
            this.context.font = '12px Arial';
            this.context.fillText(bar.label, bar.x + 5, bar.y + 15);
        }

        // Draw fraction if exists
        if (bar.fraction) {
            this.context.fillStyle = '#000000';
            this.context.font = '12px Arial';
            this.context.fillText(bar.fraction, bar.x + bar.w - 30, bar.y + bar.h - 5);
        }
    }

    drawMat(mat) {
        this.context.fillStyle = mat.color;
        this.context.fillRect(mat.x, mat.y, mat.w, mat.h);

        if (mat.isSelected) {
            this.context.strokeStyle = '#0000FF';
            this.context.lineWidth = 2;
            this.context.strokeRect(mat.x, mat.y, mat.w, mat.h);
        }
    }

    // Implement findBarAtPoint method
    findBarAtPoint(p) {
        for (let i = this.bars.length - 1; i >= 0; i--) { // Reverse for top-most first
            const bar = this.bars[i];
            if (p.x >= bar.x && p.x <= bar.x + bar.w &&
                p.y >= bar.y && p.y <= bar.y + bar.h) {
                return bar;
            }
        }
        return null;
    }

    // Implement findMatAtPoint method
    findMatAtPoint(p) {
        for (let i = this.mats.length - 1; i >= 0; i--) {
            const mat = this.mats[i];
            if (p.x >= mat.x && p.x <= mat.x + mat.w &&
                p.y >= mat.y && p.y <= mat.y + mat.h) {
                return mat;
            }
        }
        return null;
    }

    // Implement updateCanvas method (for dragging or drawing)
    updateCanvas(p) {
        if (this.mouseDownLoc) {
            const ctx = this.context;
            const start = this.mouseDownLoc;
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            this.refreshCanvas();
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1;
            ctx.strokeRect(start.x, start.y, p.x - start.x, p.y - start.y);
        }
    }

    // Implement print_canvas method
    print_canvas() {
        const dataUrl = this.context.canvas.toDataURL();
        const windowContent = '<!DOCTYPE html>';
        windowContent += '<html>'
        windowContent += '<head><title>Print Fraction Bars</title></head>';
        windowContent += '<body>'
        windowContent += `<img src="${dataUrl}" alt="Fraction Bars"/>`
        windowContent += '</body>';
        windowContent += '</html>';
        const printWin = window.open('', '', 'width=800,height=600');
        printWin.document.open();
        printWin.document.write(windowContent);
        printWin.document.close();
        printWin.focus();
        printWin.print();
        printWin.close();
    }

    // Implement setFillColor method
    setFillColor(color) {
        this.currentFillColor = color;
    }

    // Implement updateColorsOfSelectedBars method
    updateColorsOfSelectedBars() {
        this.selectedBars.forEach(bar => {
            bar.color = this.currentFillColor;
        });
    }

    // Implement makeMake method (create fraction bar)
    makeMake(num_frac) {
        // Placeholder for actual implementation
        alert(`Create a fraction bar with value: ${num_frac}`);
        // Implement the logic to create a bar based on the fraction
    }
}

// Initialize the Application
document.addEventListener('DOMContentLoaded', () => {
    // Define hiddenButtonsName and hiddenButtons arrays
    window.hiddenButtonsName = [];
    window.hiddenButtons = [];

    // Hide certain buttons initially
    hideButton("id_filetext");
    hideButton("action_previous");
    hideButton("action_next");

    const fbCanvasElement = document.getElementById('fbCanvas');
    const fbContext = fbCanvasElement.getContext('2d');
    const fbCanvasObj = new FractionBarsCanvas(fbContext);

    const splitDisplayElement = document.getElementById('split-display');
    const splitWidgetContext = splitDisplayElement.getContext('2d');
    const splitWidgetObj = new SplitsWidget(splitWidgetContext);

    // Initialize jQuery UI Sliders and Dialogs
    $("#split-slider").slider({
        change: (event, ui) => {
            splitWidgetObj.handleSliderChange(event, ui);
        },
        slide: (event, ui) => {
            $("#split-slider-field").val(ui.value);
        },
        min: 2,
        max: 20,
        step: 1,
        value: 2
    });
    $("#split-slider-field").val($("#split-slider").slider("value"));

    // Handle Vertical/Horizontal Radio Buttons
    const vertRadio = document.getElementById('vert');
    const horizRadio = document.getElementById('horiz');
    vertRadio.addEventListener('change', (e) => {
        splitWidgetObj.handleVertHorizChange(e);
    });
    horizRadio.addEventListener('change', (e) => {
        splitWidgetObj.handleVertHorizChange(e);
    });

    // Handle File Selection
    const fileInput = document.getElementById('files');
    fileInput.addEventListener('change', (e) => {
        fbCanvasObj.handleFileSelect(e);
    });

    // Handle Canvas Double Click
    fbCanvasElement.addEventListener('dblclick', () => {
        const fbImg = fbContext.getImageData(0, 0, 1000, 600);
        fbContext.clearRect(0, 0, 1000, 600);
        fbContext.putImageData(fbImg, 0, 0);
    });

    // Handle Canvas Mouse Move
    fbCanvasElement.addEventListener('mousemove', (e) => {
        const p = Point.createFromMouseEvent(e, fbCanvasElement);
        if (fbCanvasObj.currentAction === "manualSplit") {
            fbCanvasObj.manualSplitPoint = p;
            fbCanvasObj.refreshCanvas();
        }
        if (fbCanvasObj.mouseDownLoc !== null) {
            fbCanvasObj.updateCanvas(p);
        }
    });

    // Handle Canvas Mouse Down
    fbCanvasElement.addEventListener('mousedown', (e) => {
        fbCanvasObj.cacheUndoState();
        const p = Point.createFromMouseEvent(e, fbCanvasElement);
        fbCanvasObj.mouseDownLoc = p;
        const clickedBar = fbCanvasObj.findBarAtPoint(p);
        const clickedMat = fbCanvasObj.findMatAtPoint(p);

        if (fbCanvasObj.currentAction === 'bar' || fbCanvasObj.currentAction === 'mat') {
            fbCanvasObj.save();
        } else if (fbCanvasObj.currentAction === 'repeat') {
            fbCanvasObj.addUndoState();
            if (clickedBar) {
                clickedBar.repeat(p);
                fbCanvasObj.refreshCanvas();
            }
        } else {
            // Selection Logic
            if (clickedBar) {
                if (!utilities.shiftKeyDown) {
                    fbCanvasObj.clearSelection();
                }
                if (!fbCanvasObj.selectedBars.includes(clickedBar)) {
                    fbCanvasObj.selectedBars.push(clickedBar);
                    clickedBar.isSelected = true;
                } else {
                    if (utilities.shiftKeyDown) {
                        fbCanvasObj.removeBarFromSelection(clickedBar);
                    }
                }
            } else if (clickedMat) {
                if (!utilities.shiftKeyDown) {
                    fbCanvasObj.clearSelection();
                }
                if (!fbCanvasObj.selectedMats.includes(clickedMat)) {
                    fbCanvasObj.selectedMats.push(clickedMat);
                    clickedMat.isSelected = true;
                } else {
                    if (utilities.shiftKeyDown) {
                        fbCanvasObj.removeMatFromSelection(clickedMat);
                    }
                }
            } else {
                fbCanvasObj.clearSelection();
            }
            fbCanvasObj.refreshCanvas();
        }
    });

    // Handle Canvas Mouse Up
    fbCanvasElement.addEventListener('mouseup', (e) => {
        const p = Point.createFromMouseEvent(e, fbCanvasElement);
        fbCanvasObj.mouseUpLoc = p;

        if (fbCanvasObj.currentAction === 'bar') {
            fbCanvasObj.addBar();
            fbCanvasObj.clearSelection();
        } else if (fbCanvasObj.currentAction === 'mat') {
            fbCanvasObj.addMat();
            fbCanvasObj.clearSelection();
        }

        fbCanvasObj.mouseDownLoc = null;
        fbCanvasObj.mouseUpLoc = null;
        fbCanvasObj.mouseLastLoc = null;
    });

    // Handle Color Block Clicks
    document.querySelectorAll('.colorBlock').forEach(block => {
        block.addEventListener('click', (e) => {
            const color = window.getComputedStyle(block).backgroundColor;
            fbCanvasObj.setFillColor(color);
            document.querySelectorAll('.colorBlock').forEach(cb => cb.classList.remove('colorSelected'));
            block.classList.add('colorSelected');
            fbCanvasObj.updateColorsOfSelectedBars();
            fbCanvasObj.refreshCanvas();
        });
    });

    document.querySelectorAll('.colorBlock1').forEach(block => {
        block.addEventListener('click', (e) => {
            fbCanvasElement.style.backgroundColor = window.getComputedStyle(block).backgroundColor;
            document.querySelectorAll('.colorBlock1').forEach(cb => cb.classList.remove('colorSelected'));
            block.classList.add('colorSelected');
        });
    });

    // Handle Tool and Action Clicks
    document.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', (e) => {
            const thisId = link.id;
            if (!thisId) return;

            if (thisId.startsWith('tool_')) {
                const toolName = thisId.substring(5);
                const isActive = fbCanvasObj.currentAction === toolName;
                fbCanvasObj.handleToolUpdate(toolName, !isActive);
                document.querySelectorAll('.toolGroup a').forEach(t => t.classList.remove('toolSelected'));
                if (!isActive) {
                    link.classList.add('toolSelected');
                }
            }

            if (thisId.startsWith('action_')) {
                const actionName = thisId.substring(7);
                handleAction(actionName, fbCanvasObj);
            }

            if (thisId.startsWith('window_')) {
                const windowName = thisId.substring(7);
                handleWindow(windowName, fbCanvasObj);
            }
        });
    });

    // Handle Keyboard Events
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Shift') {
            utilities.shiftKeyDown = true;
            fbCanvasObj.refreshCanvas();
        }
    });

    document.addEventListener('keyup', (e) => {
        if (e.key === 'Shift') {
            utilities.shiftKeyDown = false;
            fbCanvasObj.refreshCanvas();
        }

        if (e.ctrlKey && e.key === 'p') { // Ctrl + P
            fbCanvasObj.properties();
            fbCanvasObj.refreshCanvas();
        }

        if (e.ctrlKey && e.key === 's') { // Ctrl + S
            e.preventDefault(); // Prevent browser save dialog
            fbCanvasObj.save();
            fbCanvasObj.refreshCanvas();
        }

        if (e.ctrlKey && e.key === 'h') { // Ctrl + H
            toggleHideShowButtons();
            fbCanvasObj.clearSelection();
            fbCanvasObj.refreshCanvas();
        }

        if (e.ctrlKey && e.key === 'Delete') { // Ctrl + Delete
            fbCanvasObj.addUndoState();
            fbCanvasObj.deleteSelectedBars();
            fbCanvasObj.refreshCanvas();
        }
    });

    // Handle Label Input
    const labelInput = document.getElementById('labelInput');
    labelInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            fbCanvasObj.saveLabel(labelInput.value, utilities.USE_CURRENT_SELECTION);
            fbCanvasObj.hideEditLabel();
            fbCanvasObj.refreshCanvas();
        }
    });

    labelInput.addEventListener('blur', () => {
        fbCanvasObj.saveLabel(labelInput.value, utilities.USE_LAST_SELECTION);
        fbCanvasObj.hideEditLabel();
    });

    // Initialize Dialogs using jQuery UI
    $("#dialog-splits").dialog({
        height: 300,
        width: 400,
        resizable: false,
        modal: true,
        buttons: [
            {
                text: "Ok",
                click: function() {
                    const num_splits = parseInt($("#split-slider-field").val(), 10);
                    const whole = document.querySelector('input[name="whole_part"]:checked').value;
                    const direction = utilities.flag[1] ? document.querySelector('input[name="vert_horiz"]:checked').value : "Vertical";
                    fbCanvasObj.makeSplits(num_splits, direction, whole);
                    $(this).dialog("close");
                }
            },
            {
                text: "Cancel",
                click: function() {
                    $(this).dialog("close");
                }
            }
        ],
        autoOpen: false
    });

    $("#dialog-properties").dialog({
        height: 500,
        width: 400,
        resizable: false,
        modal: true,
        buttons: [
            {
                text: "Ok",
                click: function() {
                    // Handle Iterations
                    const create_checked = document.querySelector('input[name="create"]:checked').value;
                    utilities.flag[0] = (create_checked === "Same");

                    // Handle Split Direction
                    const horiz_checked = document.querySelector('input[name="two_split"]:checked').value;
                    utilities.flag[1] = (horiz_checked === "Two_horiz");
                    document.getElementById("radio_vert").style.display = utilities.flag[1] ? 'block' : 'none';

                    // Handle Iterate Way
                    const iterate_checked = document.querySelector('input[name="two_ittr"]:checked').value;
                    utilities.flag[2] = (iterate_checked === "Two_way");
                    document.getElementById("iterate_vert-horiz").style.display = utilities.flag[2] ? 'block' : 'none';

                    // Handle Language Selection
                    const language_checked = document.querySelector('input[name="lang"]:checked').value;
                    if (language_checked === 'lang_eng') {
                        utilities.flag[3] = false;
                        document.getElementById('stylesheet').href = 'css/lang_eng.css';
                    } else if (language_checked === 'lang_tur') {
                        utilities.flag[3] = true;
                        document.getElementById('stylesheet').href = 'css/lang_tur.css';
                    }

                    $(this).dialog("close");
                }
            },
            {
                text: "Cancel",
                click: function() {
                    $(this).dialog("close");
                }
            }
        ],
        autoOpen: false
    });

    $("#dialog-iterate").dialog({
        height: 300,
        width: 400,
        resizable: false,
        modal: true,
        buttons: [
            {
                text: "Ok",
                click: function() {
                    const num_iterate = parseInt($("#iterate-field").val(), 10);
                    const direction = utilities.flag[2] ? document.querySelector('input[name="vert_horiz"]:checked').value : "Horizontal";
                    fbCanvasObj.makeIterations(num_iterate, direction);
                    $(this).dialog("close");
                }
            },
            {
                text: "Cancel",
                click: function() {
                    $(this).dialog("close");
                }
            }
        ],
        autoOpen: false
    });

    $("#dialog-make").dialog({
        height: 300,
        width: 400,
        resizable: false,
        modal: true,
        buttons: [
            {
                text: "Ok",
                click: function() {
                    const num_whole = parseFloat(document.getElementById('whole-field').value) || 0;
                    const num_num = parseFloat(document.getElementById('num-field').value) || 0;
                    const num_denum = parseFloat(document.getElementById('denum-field').value) || 1;

                    const num_frac = num_whole + (num_num / num_denum);
                    if (!num_frac) {
                        alert("Please input a valid fraction!");
                    } else {
                        fbCanvasObj.makeMake(num_frac);
                    }

                    // Reset input fields
                    document.getElementById('whole-field').value = "";
                    document.getElementById('num-field').value = "";
                    document.getElementById('denum-field').value = "";
                    $(this).dialog("close");
                }
            },
            {
                text: "Cancel",
                click: function() {
                    $(this).dialog("close");
                }
            }
        ],
        autoOpen: false
    });

    $("#dialog-file").dialog({
        height: 250,
        width: 300,
        modal: true,
        buttons: [
            {
                text: "Cancel",
                click: function() {
                    $(this).dialog("close");
                }
            }
        ],
        autoOpen: false
    });

    // Initialize File Reader
    const fileInputElement = document.getElementById('files');
    fileInputElement.addEventListener('change', (e) => {
        fbCanvasObj.handleFileSelect(e);
    });

    // Helper Functions
    function handleAction(actionName, fbCanvasObj) {
        switch (actionName) {
            case 'copy':
                fbCanvasObj.addUndoState();
                fbCanvasObj.copyBars();
                fbCanvasObj.refreshCanvas();
                break;
            case 'delete':
                fbCanvasObj.addUndoState();
                fbCanvasObj.deleteSelectedBars();
                fbCanvasObj.refreshCanvas();
                break;
            case 'join':
                fbCanvasObj.addUndoState();
                fbCanvasObj.joinSelected();
                fbCanvasObj.refreshCanvas();
                break;
            case 'setUnitBar':
                fbCanvasObj.addUndoState();
                fbCanvasObj.setUnitBar();
                fbCanvasObj.refreshCanvas();
                break;
            case 'measure':
                fbCanvasObj.addUndoState();
                fbCanvasObj.measureBars();
                fbCanvasObj.refreshCanvas();
                break;
            case 'make':
                fbCanvasObj.addUndoState();
                fbCanvasObj.make();
                fbCanvasObj.refreshCanvas();
                break;
            case 'breakApart':
                fbCanvasObj.addUndoState();
                fbCanvasObj.breakApartBars();
                fbCanvasObj.refreshCanvas();
                break;
            case 'clearSplits':
                fbCanvasObj.addUndoState();
                fbCanvasObj.clearSplits();
                fbCanvasObj.refreshCanvas();
                break;
            case 'pullOutSplit':
                fbCanvasObj.addUndoState();
                fbCanvasObj.pullOutSplit();
                fbCanvasObj.refreshCanvas();
                break;
            case 'undo':
                fbCanvasObj.undo();
                fbCanvasObj.refreshCanvas();
                break;
            case 'redo':
                fbCanvasObj.redo();
                fbCanvasObj.refreshCanvas();
                break;
            case 'save':
                fbCanvasObj.save();
                break;
            case 'open':
                fbCanvasObj.openFileDialog();
                break;
            case 'print':
                fbCanvasObj.print_canvas();
                break;
            case 'clearAll':
                if (confirm("Do you want to save before clearing?")) {
                    fbCanvasObj.save();
                }
                location.reload();
                break;
            case 'show':
                showAllButtons();
                break;
            case 'previous':
                previousSelectFile();
                break;
            case 'next':
                nextSelectFile();
                break;
            default:
                break;
        }
    }

    function handleWindow(windowName, fbCanvasObj) {
        switch (windowName) {
            case 'label':
                fbCanvasObj.editLabel();
                break;
            case 'split':
                $("#dialog-splits").dialog("open");
                break;
            case 'iterate':
                $("#dialog-iterate").dialog("open");
                break;
            case 'properties':
                $("#dialog-properties").dialog("open");
                break;
            default:
                break;
        }
    }

    // Toggle Hide/Show Buttons
    function toggleHideShowButtons() {
        if (utilities.ctrlKeyDown) {
            showButton("tool_hide");
            showButton("action_show");
            utilities.ctrlKeyDown = false;
        } else {
            utilities.ctrlKeyDown = true;
            hideButton("tool_hide");
            hideButton("action_show");
        }
    }

    // Show All Hidden Buttons
    function showAllButtons() {
        hiddenButtons.forEach(btn => btn.show());
        hiddenButtons = [];
        hiddenButtonsName = [];
    }

    // Show Button Function
    function showButton(item) {
        const index = hiddenButtonsName.indexOf(item);
        if (index > -1) {
            hiddenButtons[index].show();
            hiddenButtonsName.splice(index, 1);
            hiddenButtons.splice(index, 1);
        }
    }

    // Hide Button Function
    function hideButton(item) {
        if (!hiddenButtonsName.includes(item)) {
            const element = document.getElementById(item);
            if (element) {
                element.style.display = 'none';
                hiddenButtonsName.push(item);
                hiddenButtons.push($(element));
            }
        }
    }

    // File Selection Helpers
    function previousSelectFile() {
        if (utilities.file_index > 0) {
            utilities.file_index -= 1;
            loadSelectedFile();
        }
    }

    function nextSelectFile() {
        if (utilities.file_index < utilities.file_list.length - 1) {
            utilities.file_index += 1;
            loadSelectedFile();
        }
    }

    function loadSelectedFile() {
        const files = utilities.file_list;
        if (utilities.file_index >= 0 && utilities.file_index < files.length) {
            const selectedFile = files[utilities.file_index];
            fbCanvasObj.addUndoState();
            fbCanvasObj.save();
            const reader = new FileReader();
            reader.onload = (e) => {
                fbCanvasObj.handleFileEvent(e);
            };
            reader.readAsText(selectedFile);
            showSelectList();
        }
    }

    function showSelectList() {
        const files = utilities.file_list;
        const selectElement = document.getElementById('id_filetext');
        const titleElement = document.getElementById('bar_titles');
        const currentFile = files[utilities.file_index];

        document.title = `Fraction Bars: ${currentFile.name}`;
        titleElement.textContent = `: ${currentFile.name}`;

        if (files.length === 1) {
            hideButton("id_filetext");
            hideButton("action_previous");
            hideButton("action_next");
        } else if (utilities.file_index === files.length - 1) {
            showButton("id_filetext");
            showButton("action_previous");
            hideButton("action_next");
        } else if (utilities.file_index === 0) {
            showButton("id_filetext");
            hideButton("action_previous");
            showButton("action_next");
        } else {
            showButton("id_filetext");
            showButton("action_previous");
            showButton("action_next");
        }

        // Populate the select list
        selectElement.innerHTML = '';
        files.forEach((file, index) => {
            const option = document.createElement('option');
            option.value = file.name;
            option.text = file.name;
            if (index === utilities.file_index) {
                option.selected = true;
            }
            selectElement.appendChild(option);
        });
    }


// Helper Function Definitions
function hideButton(item) {
    if (!window.hiddenButtonsName.includes(item)) {
        const element = document.getElementById(item);
        if (element) {
            element.style.display = 'none';
            window.hiddenButtonsName.push(item);
            window.hiddenButtons.push($(element));
        }
    }
}

function showButton(item) {
    const index = window.hiddenButtonsName.indexOf(item);
    if (index > -1) {
        window.hiddenButtons[index].show();
        window.hiddenButtonsName.splice(index, 1);
        window.hiddenButtons.splice(index, 1);
    }
}

// Handle Actions
function handleAction(actionName, fbCanvasObj) {
    switch (actionName) {
        case 'copy':
            fbCanvasObj.addUndoState();
            fbCanvasObj.copyBars();
            fbCanvasObj.refreshCanvas();
            break;
        case 'delete':
            fbCanvasObj.addUndoState();
            fbCanvasObj.deleteSelectedBars();
            fbCanvasObj.refreshCanvas();
            break;
        case 'join':
            fbCanvasObj.addUndoState();
            fbCanvasObj.joinSelected();
            fbCanvasObj.refreshCanvas();
            break;
        case 'setUnitBar':
            fbCanvasObj.addUndoState();
            fbCanvasObj.setUnitBar();
            fbCanvasObj.refreshCanvas();
            break;
        case 'measure':
            fbCanvasObj.addUndoState();
            fbCanvasObj.measureBars();
            fbCanvasObj.refreshCanvas();
            break;
        case 'make':
            fbCanvasObj.addUndoState();
            fbCanvasObj.make();
            fbCanvasObj.refreshCanvas();
            break;
        case 'breakApart':
            fbCanvasObj.addUndoState();
            fbCanvasObj.breakApartBars();
            fbCanvasObj.refreshCanvas();
            break;
        case 'clearSplits':
            fbCanvasObj.addUndoState();
            fbCanvasObj.clearSplits();
            fbCanvasObj.refreshCanvas();
            break;
        case 'pullOutSplit':
            fbCanvasObj.addUndoState();
            fbCanvasObj.pullOutSplit();
            fbCanvasObj.refreshCanvas();
            break;
        case 'undo':
            fbCanvasObj.undo();
            fbCanvasObj.refreshCanvas();
            break;
        case 'redo':
            fbCanvasObj.redo();
            fbCanvasObj.refreshCanvas();
            break;
        case 'save':
            fbCanvasObj.save();
            break;
        case 'open':
            fbCanvasObj.openFileDialog();
            break;
        case 'print':
            fbCanvasObj.print_canvas();
            break;
        case 'clearAll':
            if (confirm("Do you want to save before clearing?")) {
                fbCanvasObj.save();
            }
            location.reload();
            break;
        case 'show':
            showAllButtons();
            break;
        case 'previous':
            previousSelectFile();
            break;
        case 'next':
            nextSelectFile();
            break;
        default:
            break;
    }
}

// Handle Window Actions
function handleWindow(windowName, fbCanvasObj) {
    switch (windowName) {
        case 'label':
            fbCanvasObj.editLabel();
            break;
        case 'split':
            $("#dialog-splits").dialog("open");
            break;
        case 'iterate':
            $("#dialog-iterate").dialog("open");
            break;
        case 'properties':
            $("#dialog-properties").dialog("open");
            break;
        default:
            break;
    }
}

// Toggle Hide/Show Buttons
function toggleHideShowButtons() {
    if (utilities.ctrlKeyDown) {
        showButton("tool_hide");
        showButton("action_show");
        utilities.ctrlKeyDown = false;
    } else {
        utilities.ctrlKeyDown = true;
        hideButton("tool_hide");
        hideButton("action_show");
    }
}

// Show All Hidden Buttons
function showAllButtons() {
    window.hiddenButtons.forEach(btn => btn.show());
    window.hiddenButtons = [];
    window.hiddenButtonsName = [];
}

// File Selection Helpers
function previousSelectFile() {
    if (utilities.file_index > 0) {
        utilities.file_index -= 1;
        loadSelectedFile();
    }
}

function nextSelectFile() {
    if (utilities.file_index < utilities.file_list.length - 1) {
        utilities.file_index += 1;
        loadSelectedFile();
    }
}

function loadSelectedFile() {
    const files = utilities.file_list;
    if (utilities.file_index >= 0 && utilities.file_index < files.length) {
        const selectedFile = files[utilities.file_index];
        fbCanvasObj.addUndoState();
        fbCanvasObj.save();
        const reader = new FileReader();
        reader.onload = (e) => {
            fbCanvasObj.handleFileEvent(e);
        };
        reader.readAsText(selectedFile);
        showSelectList();
    }
}

function showSelectList() {
    const files = utilities.file_list;
    const selectElement = document.getElementById('id_filetext');
    const titleElement = document.getElementById('bar_titles');
    const currentFile = files[utilities.file_index];

    document.title = `Fraction Bars: ${currentFile.name}`;
    titleElement.textContent = `: ${currentFile.name}`;

    if (files.length === 1) {
        hideButton("id_filetext");
        hideButton("action_previous");
        hideButton("action_next");
    } else if (utilities.file_index === files.length - 1) {
        showButton("id_filetext");
        showButton("action_previous");
        hideButton("action_next");
    } else if (utilities.file_index === 0) {
        showButton("id_filetext");
        hideButton("action_previous");
        showButton("action_next");
    } else {
        showButton("id_filetext");
        showButton("action_previous");
        showButton("action_next");
    }

    // Populate the select list
    selectElement.innerHTML = '';
    files.forEach((file, index) => {
        const option = document.createElement('option');
        option.value = file.name;
        option.text = file.name;
        if (index === utilities.file_index) {
            option.selected = true;
        }
        selectElement.appendChild(option);
    });
}
