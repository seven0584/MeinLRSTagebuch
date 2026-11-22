// Benchmark adapter. The referenced Brill & Moore implementation is unmodified.
import de.unituebingen.sfs.brillmoore.Candidate;
import de.unituebingen.sfs.brillmoore.Misspelling;
import de.unituebingen.sfs.brillmoore.SpellChecker;
import java.nio.file.*;
import java.nio.charset.StandardCharsets;
import java.io.*;
import java.util.*;

public final class BmBenchmark {
    private static String quote(String s) {
        StringBuilder b = new StringBuilder("\"");
        for (char c : s.toCharArray()) {
            switch (c) {
                case '"': b.append("\\\""); break;
                case '\\': b.append("\\\\"); break;
                case '\n': b.append("\\n"); break;
                case '\r': b.append("\\r"); break;
                case '\t': b.append("\\t"); break;
                default: if (c < 32) b.append(String.format(Locale.ROOT, "\\u%04x", (int)c)); else b.append(c);
            }
        }
        return b.append('"').toString();
    }
    public static void main(String[] args) throws Exception {
        if (args.length != 3 && args.length != 4) throw new IllegalArgumentException("train.tsv dict.tsv inputs.tsv [candidate-pools.tsv] (id TAB input; no gold)");
        long startup = System.nanoTime();
        List<Misspelling> train = new ArrayList<>();
        for (String row : Files.readAllLines(Paths.get(args[0]), StandardCharsets.UTF_8)) {
            if (row.isEmpty()) continue;
            String[] fields = row.split("\t", -1);
            if (fields.length < 2 || fields.length > 3) throw new IllegalArgumentException("Invalid training row");
            train.add(new Misspelling(fields[0], fields[1], fields.length == 3 ? Integer.parseInt(fields[2]) : 1));
        }
        Map<String, Double> dict = new TreeMap<>();
        for (String row : Files.readAllLines(Paths.get(args[1]), StandardCharsets.UTF_8)) {
            if (row.isEmpty()) continue;
            String[] fields = row.split("\t", -1);
            if (fields.length > 2) throw new IllegalArgumentException("Invalid dictionary row");
            double prior = fields.length == 2 ? Double.parseDouble(fields[1]) : 1.0;
            if (!(prior > 0 && prior <= 1) || !Double.isFinite(prior)) throw new IllegalArgumentException("Invalid dictionary prior");
            if (dict.put(fields[0], prior) != null) throw new IllegalArgumentException("Duplicate dictionary entry: " + fields[0]);
        }
        SpellChecker checker = new SpellChecker(train, dict, 3, 0.8);
        boolean scoreInput = Boolean.getBoolean("benchmark.inputScore");
        double unseenPrior = Collections.min(dict.values());
        Map<String, Map<String, Double>> pools = new HashMap<>();
        if (args.length == 4) {
            for (String row : Files.readAllLines(Paths.get(args[3]), StandardCharsets.UTF_8)) {
                if (row.isEmpty()) continue;
                String[] fields = row.split("\t", -1);
                if (fields.length < 2) throw new IllegalArgumentException("Empty candidate pool");
                Map<String, Double> pool = new TreeMap<>();
                for (int i = 1; i < fields.length; i++) {
                    Double prior = dict.get(fields[i]);
                    if (prior == null) throw new IllegalArgumentException("Candidate outside dictionary: " + fields[i]);
                    if (pool.put(fields[i], prior) != null) throw new IllegalArgumentException("Duplicate candidate");
                }
                if (pools.put(fields[0], pool) != null) throw new IllegalArgumentException("Duplicate pool ID");
            }
        }
        System.err.println("{\"startupMs\":" + ((System.nanoTime() - startup)/1e6) + ",\"trainingPairs\":" + train.size() + ",\"dictionaryEntries\":" + dict.size() + ",\"window\":3,\"minAtoA\":0.8,\"singleAugmentation\":false,\"tiePolicy\":\"fullPrecisionCostThenJavaStringLexical\"}");
        PrintWriter out = new PrintWriter(new OutputStreamWriter(System.out, StandardCharsets.UTF_8), true);
        try (BufferedReader reader = Files.newBufferedReader(Paths.get(args[2]), StandardCharsets.UTF_8)) {
            String row;
            while ((row = reader.readLine()) != null) {
                if (row.isEmpty()) continue;
                String[] fields = row.split("\t", -1);
                if (fields.length != 2) throw new IllegalArgumentException("Inputs must contain only id TAB input; no gold");
                long start = System.nanoTime();
                Map<String, Double> activeDictionary = args.length == 4 ? pools.get(fields[0]) : dict;
                if (activeDictionary == null) throw new IllegalArgumentException("Missing pool for " + fields[0]);
                List<Candidate> candidates = checker.getRankedCandidates(fields[1], activeDictionary);
                candidates.sort(Comparator.comparingDouble((Candidate c) -> c.getProb()).thenComparing(Candidate::getTarget));
                int finite = 0;
                for (Candidate c : candidates) if (Double.isFinite(c.getProb())) finite++;
                StringBuilder record = new StringBuilder("{\"id\":").append(quote(fields[0])).append(",\"input\":").append(quote(fields[1])).append(",\"candidates\":[");
                int emitted = 0;
                for (Candidate c : candidates) {
                    if (!Double.isFinite(c.getProb()) || emitted >= 10) continue;
                    if (emitted++ > 0) record.append(',');
                    record.append("{\"word\":").append(quote(c.getTarget())).append(",\"cost\":").append(c.getProb()).append('}');
                }
                record.append(']');
                if (scoreInput) {
                    // A separate unchanged alternative, including out-of-lexicon words.
                    // The broad experiment's minimum prior is its add-one unseen prior.
                    boolean inDictionary = dict.containsKey(fields[1]);
                    double prior = inDictionary ? dict.get(fields[1]) : unseenPrior;
                    List<Candidate> original = checker.getRankedCandidates(fields[1], Collections.singletonMap(fields[1], prior));
                    double cost = original.isEmpty() ? Double.POSITIVE_INFINITY : original.get(0).getProb();
                    record.append(",\"inputCost\":").append(Double.isFinite(cost) ? Double.toString(cost) : "null")
                        .append(",\"inputPrior\":").append(prior).append(",\"inputInDictionary\":").append(inDictionary);
                }
                record.append(",\"finiteCandidateCount\":").append(finite).append(",\"unavailableCount\":").append(candidates.size() - finite).append(",\"elapsedMs\":").append((System.nanoTime() - start)/1e6).append('}');
                out.println(record);
            }
        }
    }
}
