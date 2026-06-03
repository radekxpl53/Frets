import Chord from "@techies23/react-chords";
import guitar from "@tombatossals/chords-db/lib/guitar.json";

const instrument = {
  strings: 6,
  fretsOnChord: 4,
  name: "Guitar",
  keys: [],
  tunings: { standard: ["E", "A", "D", "G", "B", "E"] },
};

function keyToDbKey(key) {
  return key.replace("#", "sharp");
}

function ChordDiagram({ chordKey, suffix }) {
  const dbKey = keyToDbKey(chordKey);
  const chordList = guitar.chords[dbKey];

  if (!chordList) {
    return <small className="text-muted">Brak diagramu</small>;
  }

  const chordData = chordList.find((c) => c.suffix === suffix);

  if (!chordData || !chordData.positions || chordData.positions.length === 0) {
    return <small className="text-muted">Brak diagramu</small>;
  }

  const position = chordData.positions[0];

  return (
    <div className="chord-diagram" style={{ width: "120px" }}>
      <Chord chord={position} instrument={instrument} lite={false} />
    </div>
  );
}

export default ChordDiagram;