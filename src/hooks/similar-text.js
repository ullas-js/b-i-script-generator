import stringSimilarity from "string-similarity";

function isSimilarText(a, b, threshold = 0.85) {
    return stringSimilarity.compareTwoStrings(a, b) > threshold;
}

export default isSimilarText;