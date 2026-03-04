//SVG_PDF_Master
//Connor's Series of steps to make consistent prints from SVGs
//by Maxim Tsitolovsky

/**
 * Batch SVG to PDF Converter for Adobe Illustrator
 * 
 * CONFIG
 */
var CONFIG = {
    artboardWidth: 1000,
    artboardHeight: 1000,
    targetArtworkWidth: 800,
    pdfPreset: "[High Quality Print]" // Use bracket name exactly
};

(function () {
    var inputFolder = Folder.selectDialog("Select the folder with SVG files");
    if (!inputFolder) {
        alert("No input folder selected. Exiting.");
        return;
    }

    var outputFolder = Folder.selectDialog("Select the folder to save PDFs");
    if (!outputFolder) {
        alert("No output folder selected. Exiting.");
        return;
    }

    var svgFiles = inputFolder.getFiles("*.svg");
    if (svgFiles.length === 0) {
        alert("No SVG files found in the selected input folder.");
        return;
    }

    var processed = 0;
    var succeeded = 0;
    var failed = 0;

    for (var i = 0; i < svgFiles.length; i++) {
        var file = svgFiles[i];
        try {
            processed++;

            var doc = app.open(file);

            // Switch to Outline View
            app.executeMenuCommand("outline");

            // Resize Artboard
            var ab = doc.artboards[0];
            ab.artboardRect = [0, CONFIG.artboardHeight, CONFIG.artboardWidth, 0];
            doc.artboards.setActiveArtboardIndex(0);
            doc.selection = null;

            // Select all objects
            app.executeMenuCommand("selectall");

            // Get artwork bounds
            var bounds = getGeometricBounds(doc.selection);
            if (!bounds) throw new Error("Unable to compute bounds. Nothing selected.");

            var artworkWidth = bounds[2] - bounds[0];
            var scaleFactor = CONFIG.targetArtworkWidth / artworkWidth;

            // Scale selection
            for (var j = 0; j < doc.selection.length; j++) {
                doc.selection[j].resize(scaleFactor * 100, scaleFactor * 100);
            }

            // Recalculate bounds after scaling
            bounds = getGeometricBounds(doc.selection);
            var centerX = (bounds[0] + bounds[2]) / 2;
            var centerY = (bounds[1] + bounds[3]) / 2;
            var dx = 500 - centerX;
            var dy = 500 - centerY;

            // Move to center
            for (var k = 0; k < doc.selection.length; k++) {
                doc.selection[k].translate(dx, dy);
            }

            // Save temporarily as AI to enable PDF export
            var baseName = file.name.replace(/\.svg$/i, "");
            var tempAI = new File(outputFolder.fsName + "/" + baseName + ".ai");
            var pdfFile = new File(outputFolder.fsName + "/" + baseName + ".pdf");

            // Save as native AI first
            var aiOptions = new IllustratorSaveOptions();
            aiOptions.compatibility = Compatibility.ILLUSTRATOR17;
            aiOptions.pdfCompatible = true;
            doc.saveAs(tempAI, aiOptions);

            // Export as PDF
            var pdfOptions = new PDFSaveOptions();
            pdfOptions.pDFPreset = CONFIG.pdfPreset;
            doc.saveAs(pdfFile, pdfOptions);

            succeeded++;
            $.writeln("✔️ Converted: " + file.name);
            doc.close(SaveOptions.DONOTSAVECHANGES);

            // Optional: delete AI if you don't want to keep temp files
            tempAI.remove();
        } catch (e) {
            failed++;
            alert("❗ Error in file: " + file.name + "\n" + e.message);
            $.writeln("❗ Failed: " + file.name + " — " + e.message);
            try {
                if (app.documents.length > 0) {
                    app.activeDocument.close(SaveOptions.DONOTSAVECHANGES);
                }
            } catch (_) {}
        }
    }

    alert("Batch complete.\nProcessed: " + processed + "\nSucceeded: " + succeeded + "\nFailed: " + failed);
})();

/**
 * Get geometric bounds of selection array
 * @param {Array} selection 
 * @returns {[left, top, right, bottom]|null}
 */
function getGeometricBounds(selection) {
    if (!selection || selection.length === 0) return null;

    var left = null, top = null, right = null, bottom = null;

    for (var i = 0; i < selection.length; i++) {
        var item = selection[i];
        if (!item.hidden && item.geometricBounds) {
            var b = item.geometricBounds; // [left, top, right, bottom]
            if (left === null || b[0] < left) left = b[0];
            if (top === null || b[1] > top) top = b[1];
            if (right === null || b[2] > right) right = b[2];
            if (bottom === null || b[3] < bottom) bottom = b[3];
        }
    }

    if (left === null) return null;
    return [left, top, right, bottom];
}
