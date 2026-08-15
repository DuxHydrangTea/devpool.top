import { marked } from "marked";
import { markedHighlight } from "marked-highlight";
import hljs from "highlight.js";

// Custom Highlight.js for Odin language
hljs.registerLanguage('odin', function (e: any) {
  const KEYWORDS = {
      keyword: 'import package when if else for switch in do case cast auto_cast defer return break continue fallthrough using inline no_inline context foreign proc struct union enum bit_set map dynamic',
      literal: 'true false nil',
      built_in: 'len cap size_of align_of offset_of type_of type_info_of new make free delete append pop clear',
      type: 'int f32 f64 bool string cstring byte u8 u16 u32 u64 i8 i16 i32 i64 any typeid'
  };

  const NUMBERS = {
      className: 'number',
      variants: [
          { begin: e.C_NUMBER_RE + '[i|u|f]*' }, // covers 123, 1.23, 123f32
      ],
      relevance: 0
  };

  const STRINGS = {
      className: 'string',
      variants: [
          e.QUOTE_STRING_MODE,
          { begin: '`', end: '`' }
      ]
  };

  const OPERATORS = {
      className: 'keyword', 
      begin: /:=|::|->|\+|-|\*|\/|%|==|!=|>|<|>=|<=|&&|\|\||!|\+=|-=|\*=|=/
  };

  const IDENT_BEFORE_COLON = {
      className: 'title.class', 
      begin: /\b[a-zA-Z_]\w*(?=\s*:)/
  };

  const PACKAGE_PREFIX = {
      className: 'built_in', 
      begin: /\b[a-zA-Z_]\w*(?=\s*\.)/
  };

  const FUNC_INVOKE = {
      className: 'title.function', 
      begin: /\b[a-zA-Z_]\w*(?=\s*\()/
  };

  const CUSTOM_TYPES = {
      className: 'type', 
      begin: /\b[A-Z][a-zA-Z0-9_]*\b/
  };

  return {
      name: 'Odin',
      aliases: ['odin'],
      keywords: KEYWORDS,
      contains: [
          e.C_LINE_COMMENT_MODE,
          e.C_BLOCK_COMMENT_MODE,
          STRINGS,
          NUMBERS,
          OPERATORS,
          IDENT_BEFORE_COLON,
          PACKAGE_PREFIX,
          FUNC_INVOKE,
          CUSTOM_TYPES
      ]
  };
});

// Custom Highlight.js for GDScript
hljs.registerLanguage('gdscript', function (e: any) {
  const KEYWORDS = {
      keyword: 'if elif else for while break continue pass return match case await class class_name extends is as self tool signal func static const enum var super preload assert breakpoint rpc',
      literal: 'true false null PI TAU INF NAN',
      built_in: 'print randi randf randi_range randf_range lerp clamp abs min max get_node get_tree move_and_slide move_and_collide queue_free',
      type: 'int float bool void String Array Dictionary Vector2 Vector2i Vector3 Vector3i Color Rect2 Rect2i Transform2D Transform3D Node Node2D Node3D Object Resource RefCounted Control CharacterBody2D RigidBody2D StaticBody2D Area2D Camera2D AudioStreamPlayer2D RayCast2D'
  };

  const STRINGS = {
      className: 'string',
      variants: [
          e.QUOTE_STRING_MODE,
          e.APOS_STRING_MODE,
          { begin: '"""', end: '"""' },
          { begin: "'''", end: "'''" }
      ]
  };

  const FUNC_INVOKE = {
      className: 'title.function', 
      begin: /\b[a-zA-Z_]\w*(?=\s*\()/
  };

  const NODE_PATH = {
      className: 'symbol', 
      begin: /[\$%][a-zA-Z0-9_\/]+/
  };

  const ANNOTATION = {
      className: 'meta', 
      begin: /@[a-zA-Z_]\w*/
  };

  return {
      name: 'GDScript',
      aliases: ['gdscript', 'gd'],
      keywords: KEYWORDS,
      contains: [
          e.HASH_COMMENT_MODE,
          STRINGS,
          e.C_NUMBER_MODE,
          FUNC_INVOKE,
          NODE_PATH,
          ANNOTATION
      ]
  };
});

marked.use(markedHighlight({
  langPrefix: 'hljs language-',
  highlight(code, lang) {
    const language = hljs.getLanguage(lang) ? lang : 'plaintext';
    return hljs.highlight(code, { language }).value;
  }
}));

export function parseMarkdown(content: string) {
  return marked.parse(content);
}
