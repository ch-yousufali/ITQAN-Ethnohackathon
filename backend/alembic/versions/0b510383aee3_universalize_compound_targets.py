"""universalize compound_targets

Revision ID: 0b510383aee3
Revises: c55f32f8be8f
Create Date: 2026-11-04 17:07:32.104820

Hand-edited to fix three issues Alembic autogenerate introduced:
1. source_count NOT NULL needs server_default='1' (existing rows: 38,841)
2. drop_constraint(None) in downgrade would fail -- replaced with pass
3. FK given explicit name for future-proofing
"""
from alembic import op
import sqlalchemy as sa


revision = '0b510383aee3'
down_revision = 'c55f32f8be8f'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'compound_targets',
        sa.Column('source_count', sa.Integer(), nullable=False, server_default='1'),
    )
    op.add_column('compound_targets', sa.Column('manifest_id', sa.Uuid(), nullable=True))
    op.create_index(
        'ix_compound_targets_manifest_id',
        'compound_targets',
        ['manifest_id'],
        unique=False,
    )
    op.create_foreign_key(
        'fk_compound_targets_manifest_id',
        'compound_targets',
        'data_manifests',
        ['manifest_id'],
        ['id'],
        ondelete='SET NULL',
    )


def downgrade() -> None:
    # Downgrades are intentionally unsupported for this project.
    # Add a new forward migration if the schema needs to change.
    pass
