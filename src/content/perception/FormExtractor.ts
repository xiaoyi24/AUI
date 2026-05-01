/**
 * FormExtractor — 表单结构提取器
 * 识别页面中的表单，提取字段结构（label、类型、验证规则等）
 */

import type { FormSchema, FormField, SelectOption } from '../../shared/types';

/**
 * 提取页面中所有表单的结构
 */
export function extractFormSchemas(): FormSchema[] {
  const forms: FormSchema[] = [];

  document.querySelectorAll('form').forEach((form) => {
    forms.push(extractSingleForm(form as HTMLFormElement));
  });

  // 如果页面没有 <form> 标签，但有输入字段组，也尝试提取
  if (forms.length === 0) {
    const orphanForm = extractOrphanFields();
    if (orphanForm) {
      forms.push(orphanForm);
    }
  }

  return forms;
}

/**
 * 提取单个表单的结构
 */
function extractSingleForm(form: HTMLFormElement): FormSchema {
  const fields: FormField[] = [];

  form.querySelectorAll('input, select, textarea').forEach((el) => {
    const field = buildFormField(el as HTMLElement);
    if (field) {
      fields.push(field);
    }
  });

  return {
    id: form.id || `form-${Math.random().toString(36).slice(2, 8)}`,
    action: form.action || '',
    method: form.method || 'GET',
    fields,
  };
}

/**
 * 提取页面中不在 <form> 内的独立字段
 */
function extractOrphanFields(): FormSchema | null {
  const fields: FormField[] = [];
  const forms = document.querySelectorAll('form');

  // 收集所有 form 内的字段选择器
  const formFieldSelectors = new Set<string>();
  forms.forEach((form) => {
    form.querySelectorAll('input, select, textarea').forEach((el) => {
      formFieldSelectors.add(generateSimpleSelector(el as HTMLElement));
    });
  });

  // 查找不在任何 form 内的字段
  document.querySelectorAll('input, select, textarea').forEach((el) => {
    const selector = generateSimpleSelector(el as HTMLElement);
    if (!formFieldSelectors.has(selector)) {
      const field = buildFormField(el as HTMLElement);
      if (field) {
        fields.push(field);
      }
    }
  });

  if (fields.length === 0) return null;

  return {
    id: 'orphan-fields',
    action: '',
    method: 'POST',
    fields,
  };
}

/**
 * 从单个元素构建 FormField
 */
function buildFormField(el: HTMLElement): FormField | null {
  const tag = el.tagName.toLowerCase();
  const inputType = (el as HTMLInputElement).type || tag;

  // 跳过隐藏字段和提交按钮
  if (inputType === 'hidden' || inputType === 'submit' || inputType === 'button') {
    return null;
  }

  const label = findLabelForInput(el);
  const isRequired =
    (el as HTMLInputElement).required ||
    el.getAttribute('aria-required') === 'true' ||
    false;

  return {
    label: label?.innerText?.trim() || (el as HTMLInputElement).placeholder || el.getAttribute('name') || '',
    inputType,
    required: isRequired,
    placeholder: (el as HTMLInputElement).placeholder || '',
    name: el.getAttribute('name') || '',
    selector: generateSimpleSelector(el),
    options: inputType === 'select' ? extractSelectOptions(el as HTMLSelectElement) : null,
    currentValue: (el as HTMLInputElement).value || '',
    validation: {
      minLength: (el as HTMLInputElement).minLength || 0,
      maxLength: (el as HTMLInputElement).maxLength || 0,
      pattern: (el as HTMLInputElement).pattern || '',
    },
  };
}

/**
 * 查找与 input 关联的 label
 */
function findLabelForInput(input: HTMLElement): HTMLLabelElement | null {
  // 方式 1：通过 for 属性关联
  if (input.id) {
    const label = document.querySelector(`label[for="${CSS.escape(input.id)}"]`);
    if (label) return label as HTMLLabelElement;
  }

  // 方式 2：input 嵌套在 label 内
  return input.closest('label') as HTMLLabelElement | null;
}

/**
 * 提取 select 元素的选项列表
 */
function extractSelectOptions(select: HTMLSelectElement): SelectOption[] {
  return Array.from(select.options).map((opt) => ({
    value: opt.value,
    text: opt.text.trim(),
    selected: opt.selected,
  }));
}

/**
 * 生成简单的 CSS 选择器（用于去重）
 */
function generateSimpleSelector(el: HTMLElement): string {
  if (el.id) return `#${CSS.escape(el.id)}`;
  const name = el.getAttribute('name');
  if (name) return `${el.tagName.toLowerCase()}[name="${name}"]`;

  // 路径选择器
  const path: string[] = [];
  let current: HTMLElement | null = el;
  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();
    if (current.id) {
      path.unshift(`#${CSS.escape(current.id)}`);
      break;
    }
    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter((s) => s.tagName === current!.tagName);
      if (siblings.length > 1) {
        selector += `:nth-of-type(${siblings.indexOf(current) + 1})`;
      }
    }
    path.unshift(selector);
    current = current.parentElement;
  }
  return path.join(' > ');
}
