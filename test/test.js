const { expect } = require('chai');

const FastJson = require('../lib/FastJson');
const { EventTree } = require('../lib/EventTree');

describe('FastJson', () => {
  describe('constructor', () => {
    it('should create an FastJson instance', () => {
      expect(new FastJson()).to.be.instanceOf(FastJson);
    });

    it('should set a custom path separator', () => {
      const fastJson = new FastJson({ pathSeparator: '/' });
      let nMatches = 0;

      fastJson.on('user/first.name', (value) => {
        expect(value).to.be.equal('Alejandro');
        nMatches++;
      });

      fastJson.write(JSON.stringify({
        user: {
          'first.name': 'Alejandro',
          'last.name': 'Santiago',
        },
      }));
      expect(nMatches).to.be.equal(1);
    });
  });

  describe('write/on', () => {
    it('should return primitives', () => {
      const fastJson = new FastJson();
      let nMatches = 0;

      fastJson.on('a', (value) => {
        expect(value).to.be.equal('1');
        nMatches++;
      });
      fastJson.on('b', (value) => {
        expect(value).to.be.equal('true');
        nMatches++;
      });
      fastJson.on('c', (value) => {
        expect(value).to.be.equal('null');
        nMatches++;
      });
      fastJson.on('d', (value) => {
        expect(value).to.be.equal('1.2323');
        nMatches++;
      });

      fastJson.write(JSON.stringify({
        a: 1, b: true, c: null, d: 1.2323,
      }));
      expect(nMatches).to.be.equal(4);
    });

    it('should return strings', () => {
      const fastJson = new FastJson();
      let nMatches = 0;

      fastJson.on('a', (value) => {
        expect(value).to.be.equal('hello world!');
        nMatches++;
      });

      fastJson.write(JSON.stringify({
        a: 'hello world!',
      }));
      expect(nMatches).to.be.equal(1);
    });

    it('should return arrays and objects', () => {
      const fastJson = new FastJson();
      let nMatches = 0;

      fastJson.on('a', (value) => {
        expect(value).to.be.equal('{"c":1}');
        nMatches++;
      });
      fastJson.on('b', (value) => {
        expect(value).to.be.equal('[1,2,3]');
        nMatches++;
      });

      fastJson.write(JSON.stringify({ a: { c: 1 }, b: [1, 2, 3] }));
      expect(nMatches).to.be.equal(2);
    });

    it('should\'t return anything', () => {
      const fastJson = new FastJson();
      fastJson.on('a', () => {
        expect(true).to.be.equal(false);
      });

      fastJson.write(JSON.stringify({ b: 1 }));
    });

    it('should return full JSON for empty path', () => {
      const fastJson = new FastJson();
      const jsonString = JSON.stringify({ b: 1 });
      fastJson.on('', (value) => {
        expect(value).to.be.equal(jsonString);
      });
      fastJson.on([], (value) => {
        expect(value).to.be.equal(jsonString);
      });

      fastJson.write(jsonString);
    });

    it('should return inner values', () => {
      const fastJson = new FastJson();
      let nMatches = 0;

      fastJson.on('a.a[0].a', (value) => {
        expect(value).to.be.equal('5');
        nMatches++;
      });
      fastJson.on('a.a[1]', (value) => {
        expect(value).to.be.equal('null');
        nMatches++;
      });
      fastJson.on('a.a[3][0]', (value) => {
        expect(value).to.be.equal('10');
        nMatches++;
      });
      fastJson.on('b.a.a.a', (value) => {
        expect(value).to.be.equal('null');
        nMatches++;
      });

      fastJson.write(JSON.stringify({
        a: { a: [{ a: 5 }, null, true, [10]] },
        b: { a: { a: { a: null } } },
      }));
      expect(nMatches).to.be.equal(4);
    });

    it('should return values from a top level array', () => {
      const fastJson = new FastJson();
      let nMatches = 0;

      fastJson.on('[0]', (value) => {
        expect(value).to.be.equal('1');
        nMatches++;
      });
      fastJson.on('[2][0]', (value) => {
        expect(value).to.be.equal('3');
        nMatches++;
      });

      fastJson.write(JSON.stringify([1, 2, [3]]));
      expect(nMatches).to.be.equal(2);
    });

    it('should process Buffer instances', () => {
      const fastJson = new FastJson();
      let nMatches = 0;

      fastJson.on('a', (value) => {
        expect(value).to.be.deep.equal(Buffer.from('1'));
        nMatches++;
      });

      fastJson.on('b[0].c', (value) => {
        expect(value).to.be.deep.equal(Buffer.from('{"d":5}'));
        nMatches++;
      });

      fastJson.write(Buffer.from(JSON.stringify({
        a: 1,
        b: [{ c: { d: 5 } }],
      })));

      expect(nMatches).to.be.equal(2);
    });

    it('should return all values in an array', () => {
      const fastJson = new FastJson();
      let nMatches = 0;

      fastJson.on('aa[*]', (value) => {
        expect(value).to.be.equal(`{"a":${nMatches}}`);
        nMatches++;
      });

      fastJson.write(JSON.stringify({ aa: [{ a: 0 }, { a: 1 }, { a: 2 }] }));
      expect(nMatches).to.be.equal(3);
    });

    it('should return all values in an object', () => {
      const fastJson = new FastJson();
      let nMatches = 0;

      fastJson.on('aa.*', (value) => {
        expect(value).to.be.equal(`${nMatches}`);
        nMatches++;
      });

      fastJson.write(JSON.stringify({ aa: { a: 0, b: 1, c: 2 } }));
      expect(nMatches).to.be.equal(3);
    });
  });

  describe('skip', () => {
    it('should skip actual written json', () => {
      const fastJson = new FastJson();
      let nMatches = 0;

      fastJson.on('[0]', (value) => {
        expect(value).to.be.equal('1');
        nMatches++;
      });

      fastJson.on('[1]', (value) => {
        expect(value).to.be.equal('2');
        nMatches++;
        fastJson.skip();
      });

      fastJson.on('[2]', () => {
        expect(true).to.be.equal(false);
      });

      fastJson.write(JSON.stringify([1, 2, 3]));
      expect(nMatches).to.be.equal(2);
    });
  });

  describe('Edge cases', () => {
    it('should handle escaped strings', () => {
      const fastJson = new FastJson();
      let nMatches = 0;

      fastJson.on('a.a', (value) => {
        expect(value).to.be.equal('\\\\\\"\\\\');
        nMatches++;
      });

      fastJson.write(JSON.stringify({
        a: { a: '\\"\\' },
        b: { a: ']}' },
        c: { a: '{[' },
      }));

      expect(nMatches).to.be.equal(1);
    });

    it('should return primitives ignoring special characters around', () => {
      const fastJson = new FastJson();
      let nMatches = 0;

      fastJson.on('a', (value) => {
        expect(value).to.be.equal('1');
        nMatches++;
      });
      fastJson.on('b', (value) => {
        expect(value).to.be.equal('true');
        nMatches++;
      });
      fastJson.on('c', (value) => {
        expect(value).to.be.equal('null');
        nMatches++;
      });
      fastJson.on('d', (value) => {
        expect(value).to.be.equal('1.2323');
        nMatches++;
      });

      fastJson.write('{"a": 1 }');
      fastJson.write('{"b":\rtrue\r}');
      fastJson.write('{"c":\tnull\t}');
      fastJson.write('{"d":\n1.2323\n}');

      expect(nMatches).to.be.equal(4);
    });
  });
});

describe('EventTree', () => {
  describe('constructor', () => {
    it('should create an EventTree instance', () => {
      expect(new EventTree('/')).to.be.instanceOf(EventTree);
    });
  });

  describe('_parsePath', () => {
    it('should parse a path as String', () => {
      const eventTree = new EventTree('/');
      let path = eventTree._parsePath('a.b[5].c');
      expect(path).to.be.deep.equal(['a', 'b', '5', 'c']);
      path = eventTree._parsePath('[1][2].a');
      expect(path).to.be.deep.equal(['1', '2', 'a']);
    });

    it('should parse a path as Array just returning it', () => {
      const eventTree = new EventTree('/');
      const origPath = ['a', 'b', '5', 'c'];
      const path = eventTree._parsePath(origPath);
      expect(path).to.be.deep.equal(origPath);
    });

    it('should parse a path as String using a custom path separator', () => {
      const eventTree = new EventTree('/', '#');
      let path = eventTree._parsePath('a#b#5#c');
      expect(path).to.be.deep.equal(['a', 'b', '5', 'c']);
      path = eventTree._parsePath('1#2#a');
      expect(path).to.be.deep.equal(['1', '2', 'a']);
    });
  });
});
