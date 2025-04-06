async function detectObjectsFromCamera(video) {
    const model = await cocoSsd.load();
    const predictions = await model.detect(video);

    predictions.forEach(prediction => {
        const { class: label, score } = prediction;
        if (score > 0.66) {
            console.log(`Detected ${label} with ${Math.round(score * 100)}% confidence`);
            readTextAloud(`Detected ${label}`);
        }
    });
}
